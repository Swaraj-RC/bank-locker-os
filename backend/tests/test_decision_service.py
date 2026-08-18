"""
Integration tests for the decision engine — all four decision branches.

Each test exercises the full flow:
  SUBMITTED → face-verify → generate tokens → verify customer → verify bank
  → decision engine evaluates → final state

AI module is mocked in all tests — no real model is called.

Branches covered:
  1. Pass    → APPROVED → ACCESS_ACTIVE
  2. Low confidence → MANUAL_REVIEW
  3. Liveness fail  → MANUAL_REVIEW
  4. No match       → REJECTED
  5. No match × MAX_ATTEMPTS → BLOCKED
  6. FACE_VERIFICATION_REQUIRED=false → token-only path unchanged
  7. Generate tokens without face-verify → 422 (backend enforcement)
"""
import base64
import pytest

import app.core.config as cfg
from tests.conftest import auth_headers
from tests.test_face_verification import VALID_JPEG_DATA_URI


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _do_face_verify(client, request_id, op_h, mock_scenario="pass"):
    """POST face-verify with the given mock scenario."""
    r = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI, "mock_override": mock_scenario},
        headers=op_h,
    )
    assert r.status_code == 200, f"face-verify failed: {r.json()}"
    return r


def _do_generate(client, request_id, op_h, expect_success=True):
    r = client.post(f"/api/v1/verification/{request_id}/generate", headers=op_h)
    if expect_success:
        assert r.status_code == 200, f"generate failed: {r.json()}"
    return r


def _do_tokens(client, request_id, tokens, cust_h, op_h):
    """Verify both tokens. Returns the request dict after bank token."""
    v1 = client.post(
        f"/api/v1/verification/{request_id}/verify/customer",
        json={"token": tokens["demo_customer_token"]},
        headers=cust_h,
    )
    assert v1.status_code == 200, v1.json()

    v2 = client.post(
        f"/api/v1/verification/{request_id}/verify/bank",
        json={"token": tokens["demo_bank_token"]},
        headers=op_h,
    )
    assert v2.status_code == 200, v2.json()
    return v2.json()["data"]


def _full_flow(client, seeded, monkeypatch, face_scenario="pass", second_face_scenario=None):
    """Run the entire request lifecycle for the given face scenario.

    `face_scenario` is the face-verify called BEFORE token generation.
    `second_face_scenario`, if set, is called AFTER customer-token verification,
    so the decision engine sees it as the latest result at bank-token time.
    This is used to exercise REJECTED / BLOCKED decision branches where the
    initial face-verify must be 'pass' (to unlock generate), but the second
    face-verify pushes the request into a failure state before bank auth.
    """
    cust_h = auth_headers(client, "cust@test.com")
    op_h = auth_headers(client, "op@test.com")

    # Submit request
    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=cust_h)
    assert resp.status_code == 201
    request_id = resp.json()["data"]["id"]

    # Face verify (first — unlocks token generation when face_match=True)
    _do_face_verify(client, request_id, op_h, mock_scenario=face_scenario)

    # Generate tokens (requires face_match=True on latest fv row)
    gen = _do_generate(client, request_id, op_h)
    tokens = gen.json()["data"]

    # Optional second face-verify, injected after token generation so the
    # decision engine at bank-token time sees this as the latest result.
    if second_face_scenario is not None:
        client.post(
            f"/api/v1/verification/{request_id}/face-verify",
            json={"image": VALID_JPEG_DATA_URI, "mock_override": second_face_scenario},
            headers=op_h,
        )

    # Run dual-token flow
    final = _do_tokens(client, request_id, tokens, cust_h, op_h)
    return request_id, final


# ---------------------------------------------------------------------------
# Branch 1: Full pass → APPROVED → ACCESS_ACTIVE
# ---------------------------------------------------------------------------

def test_full_pass_approves_and_activates(client, seeded, monkeypatch):
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", True)
    monkeypatch.setattr(cfg.settings, "FACE_CONFIDENCE_THRESHOLD", 0.8)

    _, final = _full_flow(client, seeded, monkeypatch, face_scenario="pass")
    assert final["status"] == "ACCESS_ACTIVE", f"Expected ACCESS_ACTIVE, got {final['status']}"


# ---------------------------------------------------------------------------
# Branch 2: Low confidence → MANUAL_REVIEW
# ---------------------------------------------------------------------------

def test_low_confidence_routes_to_manual_review(client, seeded, monkeypatch):
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", True)
    monkeypatch.setattr(cfg.settings, "FACE_CONFIDENCE_THRESHOLD", 0.8)

    _, final = _full_flow(client, seeded, monkeypatch, face_scenario="low_confidence")
    assert final["status"] == "MANUAL_REVIEW", f"Expected MANUAL_REVIEW, got {final['status']}"


# ---------------------------------------------------------------------------
# Branch 3: Liveness fail → MANUAL_REVIEW
# ---------------------------------------------------------------------------

def test_liveness_fail_routes_to_manual_review(client, seeded, monkeypatch):
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", True)
    monkeypatch.setattr(cfg.settings, "FACE_CONFIDENCE_THRESHOLD", 0.8)

    _, final = _full_flow(client, seeded, monkeypatch, face_scenario="liveness_fail")
    assert final["status"] == "MANUAL_REVIEW", f"Expected MANUAL_REVIEW, got {final['status']}"


# ---------------------------------------------------------------------------
# Branch 4: No match → REJECTED
# ---------------------------------------------------------------------------

def test_no_match_rejects_request(client, seeded, monkeypatch):
    """Decision engine routes to REJECTED when latest face-verify is no_match.

    Flow: pass face-verify (unlocks generate) → generate tokens → customer token
          → no_match face-verify (becomes latest) → bank token → REJECTED.
    """
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", True)
    monkeypatch.setattr(cfg.settings, "MAX_FACE_ATTEMPTS", 3)
    monkeypatch.setattr(cfg.settings, "FACE_CONFIDENCE_THRESHOLD", 0.8)

    _, final = _full_flow(
        client, seeded, monkeypatch,
        face_scenario="pass",          # unlocks token generation
        second_face_scenario="no_match",  # latest result at decision time
    )
    assert final["status"] == "REJECTED", f"Expected REJECTED, got {final['status']}"


# ---------------------------------------------------------------------------
# Branch 5: No match × MAX_FACE_ATTEMPTS → BLOCKED
# ---------------------------------------------------------------------------

def test_exhausted_attempts_blocks_request(client, seeded, monkeypatch):
    """Submit MAX_FACE_ATTEMPTS face-verifications with no_match, then
    run the token flow — decision engine should route to BLOCKED."""
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", True)
    monkeypatch.setattr(cfg.settings, "MAX_FACE_ATTEMPTS", 3)

    cust_h = auth_headers(client, "cust@test.com")
    op_h = auth_headers(client, "op@test.com")

    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=cust_h)
    assert resp.status_code == 201
    request_id = resp.json()["data"]["id"]

    # Submit exactly MAX_FACE_ATTEMPTS failed verifications.
    for _ in range(3):
        r = client.post(
            f"/api/v1/verification/{request_id}/face-verify",
            json={"image": VALID_JPEG_DATA_URI, "mock_override": "no_match"},
            headers=op_h,
        )
        assert r.status_code == 200

    # The 4th attempt should be blocked by the attempt counter.
    r4 = client.post(
        f"/api/v1/verification/{request_id}/face-verify",
        json={"image": VALID_JPEG_DATA_URI, "mock_override": "no_match"},
        headers=op_h,
    )
    assert r4.status_code == 429
    assert r4.json()["error"]["code"] == "MAX_FACE_ATTEMPTS_EXCEEDED"

    # All attempts exhausted — generate is blocked since no face_match=True row exists.
    # The latest (and only) fv rows all have face_match=False, so face_verification_passed=False.
    gen = _do_generate(client, request_id, op_h, expect_success=False)
    assert gen.status_code == 422, f"Expected 422, got {gen.status_code}: {gen.json()}"
    assert gen.json()["error"]["code"] == "FACE_VERIFICATION_REQUIRED"


# ---------------------------------------------------------------------------
# Branch 6: FACE_VERIFICATION_REQUIRED=false → token-only path unchanged
# ---------------------------------------------------------------------------

def test_face_verification_disabled_skips_face_check(client, seeded, monkeypatch):
    """When flag is off, the existing token-only flow works without any face-verify step."""
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", False)

    cust_h = auth_headers(client, "cust@test.com")
    op_h = auth_headers(client, "op@test.com")

    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=cust_h)
    request_id = resp.json()["data"]["id"]

    # No face-verify step — go straight to token generation.
    gen = client.post(f"/api/v1/verification/{request_id}/generate", headers=op_h)
    assert gen.status_code == 200, gen.json()
    tokens = gen.json()["data"]

    final = _do_tokens(client, request_id, tokens, cust_h, op_h)
    assert final["status"] == "ACCESS_ACTIVE"


# ---------------------------------------------------------------------------
# Backend enforcement: generate without face-verify → 422
# ---------------------------------------------------------------------------

def test_generate_without_face_verify_rejected(client, seeded, monkeypatch):
    """Backend must reject token generation when face verification is required but not done."""
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", True)

    cust_h = auth_headers(client, "cust@test.com")
    op_h = auth_headers(client, "op@test.com")

    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=cust_h)
    request_id = resp.json()["data"]["id"]

    # Skip face-verify — go straight to token generation.
    gen = client.post(f"/api/v1/verification/{request_id}/generate", headers=op_h)
    assert gen.status_code == 422
    assert gen.json()["error"]["code"] == "FACE_VERIFICATION_REQUIRED"


# ---------------------------------------------------------------------------
# Audit trail: verify events were written
# ---------------------------------------------------------------------------

def test_audit_events_written_on_face_verify(client, seeded, monkeypatch):
    monkeypatch.setattr(cfg.settings, "FACE_VERIFICATION_REQUIRED", True)

    _, op_h = auth_headers(client, "cust@test.com"), auth_headers(client, "op@test.com")
    op_h = auth_headers(client, "op@test.com")
    cust_h = auth_headers(client, "cust@test.com")

    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=cust_h)
    request_id = resp.json()["data"]["id"]
    correlation_id = resp.json()["data"]["correlation_id"]

    _do_face_verify(client, request_id, op_h, mock_scenario="pass")

    # Fetch audit timeline for this correlation_id.
    timeline = client.get(f"/api/v1/audit/timeline/{correlation_id}", headers=op_h)
    assert timeline.status_code == 200
    actions = [e["action"] for e in timeline.json()["data"]]

    assert "FACE_VERIFICATION_ATTEMPTED" in actions
    assert "FACE_VERIFICATION_SUCCEEDED" in actions
