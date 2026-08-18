"""
Decision engine for the locker-access request lifecycle.

This service owns the final decision point that fires once dual-token
verification is complete. It reads the face-verification signal (if the
feature flag is enabled) and routes the request to the correct terminal
or intermediate state via state_machine.py.

Architecture rules upheld here:
- The backend is the sole decision-maker. Face signals are inputs; the
  decision is always ours.
- All state transitions go through transition_request() — never direct ORM
  mutation here.
- Every decision is audited with the same correlation_id as the request.
- FACE_VERIFICATION_REQUIRED=false bypasses the face path entirely,
  preserving the existing token-only flow with zero code changes to callers.
"""
import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import LockerStatus, RequestStatus
from app.core.responses import ApiError
from app.models import FaceVerification, LockerRequest, User
from app.services.audit_service import record_event
from app.services.state_machine import transition_locker, transition_request
from app.services import face_verification_service

logger = logging.getLogger("bank_locker_backend")


def evaluate_and_finalize(db: Session, req: LockerRequest, actor: User) -> LockerRequest:
    """Evaluate all verification signals and drive the request to its next state.

    Called by verification_service.verify_bank_token() immediately after the
    request reaches TOKEN_B_VERIFIED. This is the single decision point in
    the system where face-verification results are weighed.

    Decision logic (when FACE_VERIFICATION_REQUIRED=true):

        No face-verification row
            → ApiError 422  (backend guard; the UI should have prevented this)

        face_match=False AND attempt_number >= MAX_FACE_ATTEMPTS
            → BLOCKED  (terminal)

        face_match=False
            → REJECTED

        face_match=True BUT confidence < threshold OR liveness_passed=False
            → MANUAL_REVIEW  (staff manager must review before approval)

        face_match=True, confidence >= threshold, liveness_passed=True
            → APPROVED → locker ACCESS_ACTIVE

    When FACE_VERIFICATION_REQUIRED=false:
        → APPROVED → locker ACCESS_ACTIVE  (existing token-only path)

    All transitions go through state_machine.transition_request() and are
    recorded by audit_service.record_event().
    """
    if not settings.FACE_VERIFICATION_REQUIRED:
        return _approve_and_activate(db, req, actor)

    # Fetch the latest face-verification result for this request.
    fv: FaceVerification | None = face_verification_service.latest_face_verification(db, req.id)

    if fv is None:
        raise ApiError(
            "FACE_VERIFICATION_REQUIRED",
            "Staff face verification must be completed before access can be authorized.",
            422,
        )

    attempt_count = (
        db.query(FaceVerification)
        .filter(FaceVerification.request_id == req.id)
        .count()
    )

    # --- Decision branches ---

    if not fv.face_match:
        if attempt_count >= settings.MAX_FACE_ATTEMPTS:
            # All attempts exhausted with no match → BLOCKED (terminal).
            logger.warning(
                "request_id=%s BLOCKED: face_match=False after %d attempts",
                req.id, attempt_count,
            )
            transition_request(db, req, RequestStatus.BLOCKED.value, actor,
                               metadata={"reason": "face_match_failed_max_attempts", "attempt_count": attempt_count})
            record_event(
                db, actor=actor, action="ACCESS_BLOCKED",
                entity_type="LOCKER_REQUEST", entity_id=req.id,
                previous_state=RequestStatus.TOKEN_B_VERIFIED.value,
                new_state=RequestStatus.BLOCKED.value,
                metadata={"attempts": attempt_count},
                correlation_id=req.correlation_id,
            )
            db.commit()
            db.refresh(req)
            return req

        # face_match=False but attempts not yet exhausted → REJECTED (can re-request).
        logger.info(
            "request_id=%s REJECTED: face_match=False confidence=%.2f",
            req.id, fv.confidence,
        )
        transition_request(db, req, RequestStatus.REJECTED.value, actor,
                           metadata={"reason": "face_match_failed", "confidence": fv.confidence})
        record_event(
            db, actor=actor, action="ACCESS_REJECTED_FACE_MISMATCH",
            entity_type="LOCKER_REQUEST", entity_id=req.id,
            metadata={"confidence": fv.confidence},
            correlation_id=req.correlation_id,
        )
        db.commit()
        db.refresh(req)
        return req

    # face_match=True from here — check confidence and liveness.
    low_confidence = fv.confidence < settings.FACE_CONFIDENCE_THRESHOLD
    liveness_fail = not fv.liveness_passed

    if low_confidence or liveness_fail:
        reasons = []
        if low_confidence:
            reasons.append(f"confidence {fv.confidence:.2f} < threshold {settings.FACE_CONFIDENCE_THRESHOLD}")
        if liveness_fail:
            reasons.append("liveness check failed")

        logger.info(
            "request_id=%s → MANUAL_REVIEW: %s",
            req.id, "; ".join(reasons),
        )
        transition_request(db, req, RequestStatus.MANUAL_REVIEW.value, actor,
                           metadata={"reason": "; ".join(reasons),
                                     "confidence": fv.confidence,
                                     "liveness_passed": fv.liveness_passed})
        record_event(
            db, actor=actor, action="ACCESS_PENDING_MANUAL_REVIEW",
            entity_type="LOCKER_REQUEST", entity_id=req.id,
            metadata={"reasons": reasons},
            correlation_id=req.correlation_id,
        )
        db.commit()
        db.refresh(req)
        return req

    # All signals pass → approve and activate.
    logger.info(
        "request_id=%s APPROVED: face_match=True confidence=%.2f liveness=True",
        req.id, fv.confidence,
    )
    return _approve_and_activate(db, req, actor)


def _approve_and_activate(db: Session, req: LockerRequest, actor: User) -> LockerRequest:
    """Transition TOKEN_B_VERIFIED → APPROVED → ACCESS_ACTIVE (locker too).

    This is the existing happy-path logic, extracted here so it can be
    shared between the face-required and face-bypassed branches.
    """
    transition_request(db, req, RequestStatus.APPROVED.value, actor)
    req.approved_by = actor.id
    transition_locker(db, req.locker, LockerStatus.ACCESS_ACTIVE.value, actor,
                      correlation_id=req.correlation_id)
    transition_request(db, req, RequestStatus.ACCESS_ACTIVE.value, actor)
    record_event(
        db, actor=actor, action="ACCESS_AUTHORIZED",
        entity_type="LOCKER_REQUEST", entity_id=req.id,
        correlation_id=req.correlation_id,
    )
    db.commit()
    db.refresh(req)
    return req
