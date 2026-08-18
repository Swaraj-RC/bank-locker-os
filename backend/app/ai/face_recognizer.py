"""
Face recognition AI module.

The public surface is exactly one function:

    verify_face(image_bytes: bytes, customer_id: str) -> dict

Return shape (always):
    {
        "face_match":        bool,
        "confidence":        float,   # [0.0, 1.0]
        "liveness_passed":   bool,
        "spoof_probability": float,   # [0.0, 1.0]
    }

Callers (face_verification_service) treat this module as a black box.
No internals — preset keys, canned results, real-model routing — leak out.

AI_MODE=mock  (default): returns configurable canned results without a
              real model. Controlled by settings.MOCK_FACE_RESULT or the
              X-Mock-Face-Result request header (dev/staging only; see note).

AI_MODE=real: delegates to _run_real_model(). Currently a stub that raises
              NotImplementedError — wire in the real model here when ready.

NOTE: The X-Mock-Face-Result header override is honoured only when
settings.ENV != "production", so it is safe to leave in deployed code as long
as ENV is set correctly in production deployments.
"""
import logging

from app.core.config import settings

logger = logging.getLogger("bank_locker_backend")

# The four named mock scenarios.
_MOCK_SCENARIOS: dict[str, dict] = {
    "pass": {
        "face_match": True,
        "confidence": 0.97,
        "liveness_passed": True,
        "spoof_probability": 0.02,
    },
    "low_confidence": {
        "face_match": True,
        "confidence": 0.61,
        "liveness_passed": True,
        "spoof_probability": 0.05,
    },
    "liveness_fail": {
        "face_match": True,
        "confidence": 0.92,
        "liveness_passed": False,
        "spoof_probability": 0.74,
    },
    "no_match": {
        "face_match": False,
        "confidence": 0.23,
        "liveness_passed": True,
        "spoof_probability": 0.08,
    },
}

_RESULT_KEYS = {"face_match", "confidence", "liveness_passed", "spoof_probability"}


def _validate_result(result: dict) -> dict:
    """Validate the AI module's response shape and value ranges.

    An invalid result is a *system* error, not a failed verification — the
    caller (face_verification_service) is responsible for surfacing this
    appropriately.  Raises ValueError on any violation.
    """
    missing = _RESULT_KEYS - result.keys()
    if missing:
        raise ValueError(f"AI response missing fields: {missing}")
    if not isinstance(result["face_match"], bool):
        raise ValueError("face_match must be a bool")
    if not isinstance(result["liveness_passed"], bool):
        raise ValueError("liveness_passed must be a bool")
    for key in ("confidence", "spoof_probability"):
        v = result[key]
        if not isinstance(v, (int, float)):
            raise ValueError(f"{key} must be a number")
        if not (0.0 <= float(v) <= 1.0):
            raise ValueError(f"{key} must be in [0, 1], got {v}")
    return result


def _run_mock(override: str | None = None) -> dict:
    """Return a canned result.  `override` wins over the env-var default."""
    scenario_key = override if override in _MOCK_SCENARIOS else settings.MOCK_FACE_RESULT
    if scenario_key not in _MOCK_SCENARIOS:
        logger.warning(
            "Unknown MOCK_FACE_RESULT %r — defaulting to 'pass'. "
            "Valid values: %s",
            scenario_key,
            list(_MOCK_SCENARIOS),
        )
        scenario_key = "pass"
    result = dict(_MOCK_SCENARIOS[scenario_key])
    logger.info("AI mock: scenario=%s face_match=%s confidence=%s", scenario_key, result["face_match"], result["confidence"])
    return result


def _run_real_model(
    image_bytes: bytes,
    customer_id: str,
    blink_image_bytes: bytes | None = None,
    nod_image_bytes: bytes | None = None,
) -> dict:
    """Run real face recognition inference using the underlying AI module."""
    from app.ai import real_face_adapter

    return real_face_adapter.evaluate_real_face(
        image_bytes,
        customer_id,
        blink_image_bytes=blink_image_bytes,
        nod_image_bytes=nod_image_bytes,
    )


def verify_face(
    image_bytes: bytes,
    customer_id: str,
    mock_override: str | None = None,
    blink_image_bytes: bytes | None = None,
    nod_image_bytes: bytes | None = None,
) -> dict:
    """Public API — the only function callers should use."""
    import os
    current_ai_mode = os.getenv("AI_MODE", settings.AI_MODE)
    if mock_override and settings.ENV != "production":
        raw = _run_mock(mock_override)
    elif current_ai_mode == "mock":
        raw = _run_mock()
    else:
        raw = _run_real_model(
            image_bytes,
            customer_id,
            blink_image_bytes=blink_image_bytes,
            nod_image_bytes=nod_image_bytes,
        )

    return _validate_result(raw)
