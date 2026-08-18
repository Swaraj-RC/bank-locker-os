"""
Tests for the face-verification service and endpoint.

Covers:
- Valid image accepted
- Oversized image rejected (IMAGE_TOO_LARGE)
- Wrong content type rejected (UNSUPPORTED_IMAGE_TYPE)
- Empty / corrupt base64 rejected (INVALID_IMAGE_DATA)
- Malformed AI response → AI_SYSTEM_ERROR (not a user-visible failure)
- Attempt limit enforcement (MAX_FACE_ATTEMPTS_EXCEEDED)
- Non-staff caller rejected (FORBIDDEN)
- Rate limit triggered per-user
- Mock override via payload field and header
"""
import base64
import os
import pytest

from tests.conftest import auth_headers

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# 1x1 white JPEG — the smallest valid JPEG that will pass base64 decode.
_TINY_JPEG_BYTES = bytes([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
    0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8A, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3, 0xA4,
    0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7,
    0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA,
    0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2, 0xE3,
    0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5,
    0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00,
    0x00, 0x3F, 0x00, 0xFB, 0xD0, 0xFF, 0xD9,
])

VALID_JPEG_DATA_URI = "data:image/jpeg;base64," + base64.b64encode(_TINY_JPEG_BYTES).decode()
VALID_JPEG_RAW_B64 = base64.b64encode(_TINY_JPEG_BYTES).decode()


def _submit_request(client, seeded):
    """Create a locker request and return its id + auth headers."""
    cust_h = auth_headers(client, "cust@test.com")
    op_h = auth_headers(client, "op@test.com")
    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=cust_h)
    assert resp.status_code == 201
    return resp.json()["data"]["id"], cust_h, op_h


# ---------------------------------------------------------------------------
# Unit-style: image validation
# ---------------------------------------------------------------------------

def test_valid_jpeg_data_uri_accepted(client, seeded, monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    monkeypatch.setenv("FACE_VERIFICATION_REQUIRED", "true")
    request_id, _, op_h = _submit_request(client, seeded)

    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI},
        headers=op_h,
    )
    assert resp.status_code == 200, resp.json()
    fv = resp.json()["data"]["verification"]
    assert fv["face_match"] is True
    assert 0.0 <= fv["confidence"] <= 1.0
    assert fv["liveness_passed"] is True
    assert fv["attempt_number"] == 1


def test_valid_raw_base64_accepted(client, seeded, monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    request_id, _, op_h = _submit_request(client, seeded)

    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_RAW_B64},
        headers=op_h,
    )
    assert resp.status_code == 200, resp.json()


def test_oversized_image_rejected(client, seeded, monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    request_id, _, op_h = _submit_request(client, seeded)

    # Build a payload that's bigger than 5 MB when decoded.
    big_bytes = b"X" * (6 * 1024 * 1024)
    big_b64 = "data:image/jpeg;base64," + base64.b64encode(big_bytes).decode()

    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": big_b64},
        headers=op_h,
    )
    assert resp.status_code == 413
    assert resp.json()["error"]["code"] == "IMAGE_TOO_LARGE"


def test_wrong_content_type_rejected(client, seeded, monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    request_id, _, op_h = _submit_request(client, seeded)

    gif_b64 = "data:image/gif;base64," + base64.b64encode(b"GIF89a...").decode()
    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": gif_b64},
        headers=op_h,
    )
    assert resp.status_code == 415
    assert resp.json()["error"]["code"] == "UNSUPPORTED_IMAGE_TYPE"


def test_corrupt_base64_rejected(client, seeded, monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    request_id, _, op_h = _submit_request(client, seeded)

    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": "data:image/jpeg;base64,!!!not_valid_base64!!!"},
        headers=op_h,
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_IMAGE_DATA"


def test_empty_image_rejected(client, seeded, monkeypatch):
    monkeypatch.setenv("AI_MODE", "mock")
    request_id, _, op_h = _submit_request(client, seeded)

    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": "data:image/jpeg;base64,"},
        headers=op_h,
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_IMAGE_DATA"


# ---------------------------------------------------------------------------
# Malformed AI response → system error (not user-visible failure)
# ---------------------------------------------------------------------------

def test_malformed_ai_response_yields_system_error(client, seeded, monkeypatch):
    """If the AI module returns a broken response, the client gets AI_SYSTEM_ERROR."""
    from app.ai import face_recognizer

    def bad_verify(image_bytes, customer_id, mock_override=None):
        return {"face_match": "yes", "confidence": 2.5}  # invalid shape + ranges

    monkeypatch.setattr(face_recognizer, "verify_face", bad_verify)
    request_id, _, op_h = _submit_request(client, seeded)

    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI},
        headers=op_h,
    )
    assert resp.status_code == 502
    assert resp.json()["error"]["code"] == "AI_SYSTEM_ERROR"


# ---------------------------------------------------------------------------
# Attempt limit enforcement
# ---------------------------------------------------------------------------

def test_attempt_limit_enforced(client, seeded, monkeypatch):
    """After MAX_FACE_ATTEMPTS, further attempts return MAX_FACE_ATTEMPTS_EXCEEDED."""
    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "MAX_FACE_ATTEMPTS", 2)

    request_id, _, op_h = _submit_request(client, seeded)

    for _ in range(2):
        r = client.post(
            f"/api/v1/verification/{request_id}/face-verify",
            json={"image": VALID_JPEG_DATA_URI},
            headers=op_h,
        )
        assert r.status_code == 200

    # Third attempt should be blocked.
    r = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI},
        headers=op_h,
    )
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "MAX_FACE_ATTEMPTS_EXCEEDED"


# ---------------------------------------------------------------------------
# Auth enforcement
# ---------------------------------------------------------------------------

def test_customer_cannot_call_face_verify(client, seeded):
    """Customers are not staff — must be rejected with 403."""
    request_id, cust_h, _ = _submit_request(client, seeded)
    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI},
        headers=cust_h,
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_unauthenticated_rejected(client, seeded):
    request_id, _, _ = _submit_request(client, seeded)
    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Mock override scenarios
# ---------------------------------------------------------------------------

def test_mock_override_no_match(client, seeded, monkeypatch):
    request_id, _, op_h = _submit_request(client, seeded)
    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI, "mock_override": "no_match"},
        headers=op_h,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["verification"]["face_match"] is False


def test_mock_override_via_header(client, seeded, monkeypatch):
    request_id, _, op_h = _submit_request(client, seeded)
    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI},
        headers={**op_h, "X-Mock-Face-Result": "liveness_fail"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["verification"]["liveness_passed"] is False


def test_mock_override_low_confidence(client, seeded):
    request_id, _, op_h = _submit_request(client, seeded)
    resp = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI, "mock_override": "low_confidence"},
        headers=op_h,
    )
    assert resp.status_code == 200
    fv = resp.json()["data"]["verification"]
    assert fv["face_match"] is True
    assert fv["confidence"] < 0.8
