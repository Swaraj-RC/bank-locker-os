"""
Dual-control (two-party) verification.

CUSTOMER_TOKEN and BANK_TOKEN are generated together, short-lived, and
one-time-use. The *active* secret lives in Redis with a TTL (so it expires
automatically and can't be replayed); a hash of it is persisted in
PostgreSQL on VerificationToken for durability/auditability. Only when BOTH
tokens are independently verified does the request advance to APPROVED and
the locker flip to ACCESS_ACTIVE.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import RequestStatus, LockerStatus, TokenStatus, TokenType
from app.core.redis_client import redis_client
from app.core.responses import ApiError
from app.core.security import generate_numeric_token, hash_token
from app.models import LockerRequest, VerificationToken, User
from app.services.audit_service import record_event
from app.services.state_machine import transition_request, transition_locker


def _redis_key(request_id: str, token_type: str) -> str:
    return f"verify:{request_id}:{token_type}"


def generate_verification_pair(db: Session, req: LockerRequest, actor: User) -> dict:
    """Create CUSTOMER_TOKEN + BANK_TOKEN for a request, store secret in Redis
    (TTL-bound) and a hash record in Postgres for audit durability."""
    if req.status not in (RequestStatus.SUBMITTED.value, RequestStatus.VERIFICATION_PENDING.value):
        raise ApiError("INVALID_REQUEST_STATE", f"Cannot generate verification for request in state {req.status}", 409)

    ttl = settings.VERIFICATION_TOKEN_TTL_SECONDS
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
    plaintext_tokens = {}

    for token_type in (TokenType.CUSTOMER_TOKEN.value, TokenType.BANK_TOKEN.value):
        plaintext = generate_numeric_token(6)
        plaintext_tokens[token_type] = plaintext

        # Ephemeral secret + attempt counter live in Redis with TTL.
        redis_client.setex(_redis_key(req.id, token_type), ttl, plaintext)
        redis_client.setex(f"{_redis_key(req.id, token_type)}:attempts", ttl, 0)

        # Durable, non-reversible record in Postgres for audit reconstruction.
        record = VerificationToken(
            request_id=req.id,
            token_type=token_type,
            token_hash=hash_token(plaintext),
            expires_at=expires_at,
            attempts=0,
            status=TokenStatus.PENDING.value,
        )
        db.add(record)

    if req.status == RequestStatus.SUBMITTED.value:
        transition_request(db, req, RequestStatus.VERIFICATION_PENDING.value, actor)
    transition_locker(db, req.locker, LockerStatus.VERIFICATION_PENDING.value, actor, correlation_id=req.correlation_id)

    record_event(
        db, actor=actor, action="VERIFICATION_TOKENS_GENERATED", entity_type="LOCKER_REQUEST",
        entity_id=req.id, metadata={"ttl_seconds": ttl}, correlation_id=req.correlation_id,
    )
    db.commit()

    # NOTE: plaintext tokens are only ever returned once, at generation time,
    # simulating out-of-band delivery (SMS/branch terminal) in production.
    return {
        "expires_at": expires_at.isoformat(),
        "ttl_seconds": ttl,
        "demo_customer_token": plaintext_tokens[TokenType.CUSTOMER_TOKEN.value],
        "demo_bank_token": plaintext_tokens[TokenType.BANK_TOKEN.value],
    }


def _verify_token(db: Session, req: LockerRequest, token_type: str, submitted: str, actor: User) -> VerificationToken:
    key = _redis_key(req.id, token_type)
    stored = redis_client.get(key)

    record: VerificationToken | None = (
        db.query(VerificationToken)
        .filter(VerificationToken.request_id == req.id, VerificationToken.token_type == token_type)
        .order_by(VerificationToken.expires_at.desc())
        .first()
    )
    if not record:
        raise ApiError("TOKEN_NOT_FOUND", "No verification token exists for this request", 404)

    if record.status == TokenStatus.VERIFIED.value or record.used_at is not None:
        raise ApiError("TOKEN_ALREADY_USED", "This token has already been used", 409)

    if stored is None or record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        record.status = TokenStatus.EXPIRED.value
        db.flush()
        record_event(db, actor=actor, action="VERIFICATION_FAILED_EXPIRED", entity_type="VERIFICATION_TOKEN",
                     entity_id=record.id, correlation_id=req.correlation_id)
        db.commit()
        raise ApiError("TOKEN_EXPIRED", "Verification token has expired", 410)

    attempts_key = f"{key}:attempts"
    attempts = int(redis_client.get(attempts_key) or 0)
    if attempts >= settings.VERIFICATION_TOKEN_MAX_ATTEMPTS:
        record.status = TokenStatus.FAILED.value
        db.flush()
        record_event(db, actor=actor, action="VERIFICATION_FAILED_MAX_ATTEMPTS", entity_type="VERIFICATION_TOKEN",
                     entity_id=record.id, correlation_id=req.correlation_id)
        db.commit()
        raise ApiError("MAX_ATTEMPTS_EXCEEDED", "Maximum verification attempts exceeded", 429)

    if submitted != stored:
        redis_client.incr(attempts_key)
        record.attempts += 1
        db.flush()
        record_event(db, actor=actor, action="VERIFICATION_ATTEMPT_FAILED", entity_type="VERIFICATION_TOKEN",
                     entity_id=record.id, metadata={"attempts": record.attempts}, correlation_id=req.correlation_id)
        db.commit()
        raise ApiError("INVALID_TOKEN", "Verification token is invalid or expired", 400)

    # Success: one-time use — burn the Redis secret immediately (replay prevention).
    redis_client.delete(key)
    redis_client.delete(attempts_key)
    record.status = TokenStatus.VERIFIED.value
    record.used_at = datetime.now(timezone.utc)
    db.flush()
    record_event(db, actor=actor, action="VERIFICATION_SUCCEEDED", entity_type="VERIFICATION_TOKEN",
                 entity_id=record.id, correlation_id=req.correlation_id)
    return record


def verify_customer_token(db: Session, req: LockerRequest, submitted: str, actor: User) -> LockerRequest:
    if req.status != RequestStatus.VERIFICATION_PENDING.value:
        raise ApiError("INVALID_REQUEST_STATE", f"Request is not awaiting verification (state: {req.status})", 409)
    _verify_token(db, req, TokenType.CUSTOMER_TOKEN.value, submitted, actor)
    transition_request(db, req, RequestStatus.TOKEN_A_VERIFIED.value, actor)
    db.commit()
    db.refresh(req)
    return req


def verify_bank_token(db: Session, req: LockerRequest, submitted: str, actor: User) -> LockerRequest:
    if req.status != RequestStatus.TOKEN_A_VERIFIED.value:
        raise ApiError("INVALID_REQUEST_STATE", f"Customer token must be verified first (state: {req.status})", 409)
    _verify_token(db, req, TokenType.BANK_TOKEN.value, submitted, actor)
    transition_request(db, req, RequestStatus.TOKEN_B_VERIFIED.value, actor)

    # Dual control satisfied -> ACCESS_AUTHORIZED -> auto-approve + activate locker.
    transition_request(db, req, RequestStatus.APPROVED.value, actor)
    req.approved_by = actor.id
    transition_locker(db, req.locker, LockerStatus.ACCESS_ACTIVE.value, actor, correlation_id=req.correlation_id)
    transition_request(db, req, RequestStatus.ACCESS_ACTIVE.value, actor)

    record_event(db, actor=actor, action="ACCESS_AUTHORIZED", entity_type="LOCKER_REQUEST",
                 entity_id=req.id, correlation_id=req.correlation_id)
    db.commit()
    db.refresh(req)
    return req
