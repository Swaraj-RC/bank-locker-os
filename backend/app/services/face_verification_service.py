"""
Staff-side face verification service.

Workflow:
  1. Validate the image (content type, size, decodability).
  2. Enforce per-request attempt limit (MAX_FACE_ATTEMPTS).
  3. Enforce per-user rate limit via Redis (FACE_RATE_LIMIT_PER_MINUTE).
  4. Call the AI module (black box — we never look inside its logic).
  5. Validate the AI response shape/ranges.
  6. Persist the FaceVerification row (signals only — never the image).
  7. Emit audit events.
  8. Return the persisted row.

This service never changes request state.  State transitions are the
exclusive responsibility of decision_service.evaluate_and_finalize(),
which is called later in the token-verification flow.
"""
import base64
import binascii
import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redis_client import redis_client
from app.core.responses import ApiError
from app.models import FaceVerification, LockerRequest, User
from app.services.audit_service import record_event
from app.ai import face_recognizer

logger = logging.getLogger("bank_locker_backend")

# Allowed content-type prefixes in base64 data-URIs.
_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}


# ---------------------------------------------------------------------------
# Image helpers
# ---------------------------------------------------------------------------

def _decode_image(image_data: str) -> tuple[bytes, str]:
    """Decode a base64 data-URI or raw base64 string.

    Returns (image_bytes, detected_mime_type).
    Raises ApiError on any validation failure.
    """
    mime_type = "image/jpeg"  # default if no data-URI prefix

    if image_data.startswith("data:"):
        # data:<mime>;base64,<data>
        try:
            header, encoded = image_data.split(",", 1)
            mime_part = header.split(";")[0].split(":", 1)[1].lower().strip()
            mime_type = mime_part
        except (ValueError, IndexError):
            raise ApiError("INVALID_IMAGE_DATA", "Malformed data-URI format", 400)
    else:
        encoded = image_data

    if mime_type not in _ALLOWED_MIME_TYPES:
        raise ApiError(
            "UNSUPPORTED_IMAGE_TYPE",
            f"Image must be JPEG or PNG (received: {mime_type})",
            415,
        )

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise ApiError("INVALID_IMAGE_DATA", "Image data is not valid base64", 400)

    if len(image_bytes) == 0:
        raise ApiError("INVALID_IMAGE_DATA", "Image payload is empty", 400)

    if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
        mb = settings.MAX_IMAGE_SIZE_BYTES // (1024 * 1024)
        raise ApiError("IMAGE_TOO_LARGE", f"Image exceeds the {mb} MB limit", 413)

    return image_bytes, mime_type


# ---------------------------------------------------------------------------
# Attempt counting
# ---------------------------------------------------------------------------

def _get_attempt_count(db: Session, request_id: str) -> int:
    """Return how many face-verification attempts already exist for this request."""
    return (
        db.query(FaceVerification)
        .filter(FaceVerification.request_id == request_id)
        .count()
    )


# ---------------------------------------------------------------------------
# Per-user rate limiting (reuses the same redis_client as RateLimitMiddleware)
# ---------------------------------------------------------------------------

def _check_user_rate_limit(actor_id: str) -> None:
    """Sliding-window per-user rate limit.

    Uses the same Redis client (and same pattern) as the existing
    RateLimitMiddleware — one incr + expire-on-first-hit per minute window.
    Raises ApiError(429) if the limit is exceeded.
    """
    key = f"face_ratelimit:{actor_id}"
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, 60)
    if count > settings.FACE_RATE_LIMIT_PER_MINUTE:
        raise ApiError(
            "RATE_LIMITED",
            "Too many face verification requests. Please wait a moment and try again.",
            429,
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def submit_face_verification(
    db: Session,
    request_id: str,
    image_data: str,
    actor: User,
    blink_image_data: str | None = None,
    nod_image_data: str | None = None,
    mock_override: str | None = None,
) -> FaceVerification:
    """Capture, validate, and record one face-verification attempt."""
    # 1. Load the request and resolve customer_id server-side.
    req: LockerRequest | None = (
        db.query(LockerRequest).filter(LockerRequest.id == request_id).first()
    )
    if not req:
        raise ApiError("REQUEST_NOT_FOUND", "Request does not exist", 404)

    customer_id: str = req.customer_id  # never trust a client-supplied value

    # 2. Validate images.
    image_bytes, _mime_type = _decode_image(image_data)
    blink_bytes = _decode_image(blink_image_data)[0] if blink_image_data else None
    nod_bytes = _decode_image(nod_image_data)[0] if nod_image_data else None

    # 3. Per-request attempt limit.
    attempt_count = _get_attempt_count(db, request_id)
    if attempt_count >= settings.MAX_FACE_ATTEMPTS:
        raise ApiError(
            "MAX_FACE_ATTEMPTS_EXCEEDED",
            f"Maximum face verification attempts ({settings.MAX_FACE_ATTEMPTS}) reached for this request.",
            429,
        )

    # 4. Per-user rate limit (Redis sliding window, same mechanism as IP limiter).
    _check_user_rate_limit(actor.id)

    # 5. Call AI module (image bytes not logged — biometric data).
    try:
        ai_result = face_recognizer.verify_face(
            image_bytes,
            customer_id,
            mock_override=mock_override,
            blink_image_bytes=blink_bytes,
            nod_image_bytes=nod_bytes,
        )
        face_match: bool = bool(ai_result["face_match"])
        confidence: float = float(ai_result["confidence"])
        liveness_passed: bool = bool(ai_result["liveness_passed"])
        spoof_probability: float = float(ai_result["spoof_probability"])
        # Validate ranges
        if not (0.0 <= confidence <= 1.0):
            raise ValueError(f"confidence out of range: {confidence}")
        if not (0.0 <= spoof_probability <= 1.0):
            raise ValueError(f"spoof_probability out of range: {spoof_probability}")
    except (ValueError, KeyError, TypeError) as exc:
        # Malformed AI response (wrong shape, missing keys, wrong types) is a
        # system error — not a user-visible failure.
        logger.error(
            "AI module returned invalid response for request_id=%s: %s",
            request_id,
            exc,
            exc_info=False,  # don't log image bytes
        )
        record_event(
            db,
            actor=actor,
            action="FACE_VERIFICATION_AI_ERROR",
            entity_type="LOCKER_REQUEST",
            entity_id=request_id,
            metadata={"error": str(exc)},
            correlation_id=req.correlation_id,
        )
        db.commit()
        raise ApiError(
            "AI_SYSTEM_ERROR",
            "Face verification system returned an unexpected response. Please try again or contact support.",
            502,
        ) from exc

    # 6. Persist derived signals only — image bytes discarded here.
    attempt_number = attempt_count + 1
    fv = FaceVerification(
        request_id=request_id,
        actor_id=actor.id,
        actor_role=actor.role,
        face_match=face_match,
        confidence=confidence,
        liveness_passed=liveness_passed,
        spoof_probability=spoof_probability,
        raw_response=ai_result,   # structured signals only — not logged at INFO level
        attempt_number=attempt_number,
    )
    db.add(fv)
    db.flush()

    # 7. Audit events.
    record_event(
        db,
        actor=actor,
        action="FACE_VERIFICATION_ATTEMPTED",
        entity_type="LOCKER_REQUEST",
        entity_id=request_id,
        metadata={"attempt_number": attempt_number},
        correlation_id=req.correlation_id,
    )

    outcome_action = (
        "FACE_VERIFICATION_SUCCEEDED" if face_match else "FACE_VERIFICATION_FAILED"
    )
    record_event(
        db,
        actor=actor,
        action=outcome_action,
        entity_type="FACE_VERIFICATION",
        entity_id=fv.id,
        metadata={
            "face_match": face_match,
            "confidence": confidence,
            "liveness_passed": liveness_passed,
        },
        correlation_id=req.correlation_id,
    )

    # 8. Direct decision & state transition
    from app.services.state_machine import transition_request, transition_locker
    from app.core.enums import RequestStatus, LockerStatus

    if not face_match:
        if attempt_number >= settings.MAX_FACE_ATTEMPTS:
            logger.warning("request_id=%s BLOCKED: face mismatch after %d attempts", req.id, attempt_number)
            transition_request(db, req, RequestStatus.BLOCKED.value, actor, metadata={"reason": "max_face_attempts_exhausted"})
            record_event(
                db, actor=actor, action="ACCESS_BLOCKED",
                entity_type="LOCKER_REQUEST", entity_id=req.id,
                new_state=RequestStatus.BLOCKED.value,
                metadata={"attempts": attempt_number},
                correlation_id=req.correlation_id,
            )
    else:
        # face_match = True
        low_confidence = confidence < settings.FACE_CONFIDENCE_THRESHOLD
        liveness_fail = not liveness_passed

        if low_confidence or liveness_fail:
            reasons = []
            if low_confidence:
                reasons.append(f"confidence {confidence:.2f} < threshold {settings.FACE_CONFIDENCE_THRESHOLD}")
            if liveness_fail:
                reasons.append("liveness check failed")

            logger.info("request_id=%s -> MANUAL_REVIEW: %s", req.id, "; ".join(reasons))
            transition_request(db, req, RequestStatus.MANUAL_REVIEW.value, actor,
                               metadata={"reason": "; ".join(reasons), "confidence": confidence, "liveness_passed": liveness_passed})
            record_event(
                db, actor=actor, action="ACCESS_PENDING_MANUAL_REVIEW",
                entity_type="LOCKER_REQUEST", entity_id=req.id,
                metadata={"reasons": reasons},
                correlation_id=req.correlation_id,
            )
        else:
            # All signals pass -> Approve & Authorize Access
            logger.info("request_id=%s APPROVED & ACCESS_ACTIVE: face_match=True confidence=%.2f", req.id, confidence)
            transition_request(db, req, RequestStatus.APPROVED.value, actor)
            req.approved_by = actor.id
            if req.locker:
                transition_locker(db, req.locker, LockerStatus.ACCESS_ACTIVE.value, actor, correlation_id=req.correlation_id)
            transition_request(db, req, RequestStatus.ACCESS_ACTIVE.value, actor)
            record_event(
                db, actor=actor, action="ACCESS_AUTHORIZED",
                entity_type="LOCKER_REQUEST", entity_id=req.id,
                metadata={"confidence": confidence, "verified_customer_id": customer_id},
                correlation_id=req.correlation_id,
            )

    db.commit()
    db.refresh(fv)
    return fv


def latest_face_verification(db: Session, request_id: str) -> FaceVerification | None:
    """Return the most recent FaceVerification row for a request, or None."""
    return (
        db.query(FaceVerification)
        .filter(FaceVerification.request_id == request_id)
        .order_by(FaceVerification.attempt_number.desc(), FaceVerification.created_at.desc())
        .first()
    )


def face_verification_passed(db: Session, request_id: str) -> bool:
    """Return True if there is a face-verification attempt with face_match=True for this request.

    The generate-tokens gate only requires face_match=True — this confirms that a staff
    member successfully captured and matched the customer's face. Confidence thresholds
    and liveness decisions are the exclusive responsibility of the decision engine, which
    evaluates them at bank-token-verify time and routes to MANUAL_REVIEW when appropriate.

    Rationale: gating generate on confidence+liveness here would prevent low_confidence and
    liveness_fail scenarios from ever reaching the decision engine, making MANUAL_REVIEW
    routing unreachable. The backend source-of-truth enforcement is still upheld — we just
    correctly partition the responsibility between the two stages.
    """
    if not settings.FACE_VERIFICATION_REQUIRED:
        return True

    fv = latest_face_verification(db, request_id)
    if fv is None:
        return False
    # Only gate on face_match — nuanced decisions (confidence, liveness) belong to the decision engine.
    return fv.face_match
