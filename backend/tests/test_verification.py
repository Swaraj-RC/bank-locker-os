from tests.conftest import auth_headers


def _submit_and_generate(client, seeded):
    cust_headers = auth_headers(client, "cust@test.com")
    op_headers = auth_headers(client, "op@test.com")

    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=cust_headers)
    request_id = resp.json()["data"]["id"]

    gen = client.post(f"/api/v1/verification/{request_id}/generate", headers=op_headers)
    assert gen.status_code == 200
    tokens = gen.json()["data"]
    return request_id, tokens, cust_headers, op_headers


def test_full_dual_token_flow_authorizes_access(client, seeded):
    request_id, tokens, cust_headers, op_headers = _submit_and_generate(client, seeded)

    v1 = client.post(f"/api/v1/verification/{request_id}/verify/customer",
                      json={"token": tokens["demo_customer_token"]}, headers=cust_headers)
    assert v1.status_code == 200
    assert v1.json()["data"]["status"] == "TOKEN_A_VERIFIED"

    v2 = client.post(f"/api/v1/verification/{request_id}/verify/bank",
                      json={"token": tokens["demo_bank_token"]}, headers=op_headers)
    assert v2.status_code == 200
    assert v2.json()["data"]["status"] == "ACCESS_ACTIVE"

    # Locker should now be ACCESS_ACTIVE too
    lockers = client.get("/api/v1/admin/lockers", headers=op_headers).json()["data"]
    locker = next(l for l in lockers if l["id"] == seeded["locker"].id)
    assert locker["status"] == "ACCESS_ACTIVE"


def test_wrong_customer_token_rejected(client, seeded):
    request_id, tokens, cust_headers, op_headers = _submit_and_generate(client, seeded)
    resp = client.post(f"/api/v1/verification/{request_id}/verify/customer",
                        json={"token": "000000"}, headers=cust_headers)
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_TOKEN"


def test_reused_token_rejected(client, seeded):
    request_id, tokens, cust_headers, op_headers = _submit_and_generate(client, seeded)
    client.post(f"/api/v1/verification/{request_id}/verify/customer",
                json={"token": tokens["demo_customer_token"]}, headers=cust_headers)
    # Attempt to reuse the same customer token again
    resp = client.post(f"/api/v1/verification/{request_id}/verify/customer",
                        json={"token": tokens["demo_customer_token"]}, headers=cust_headers)
    # Request has already moved past VERIFICATION_PENDING, so this should be an invalid state
    assert resp.status_code == 409


def test_bank_token_cannot_be_verified_before_customer_token(client, seeded):
    request_id, tokens, cust_headers, op_headers = _submit_and_generate(client, seeded)
    resp = client.post(f"/api/v1/verification/{request_id}/verify/bank",
                        json={"token": tokens["demo_bank_token"]}, headers=op_headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_REQUEST_STATE"


def test_excessive_attempts_locks_token(client, seeded):
    request_id, tokens, cust_headers, op_headers = _submit_and_generate(client, seeded)
    for _ in range(3):
        resp = client.post(f"/api/v1/verification/{request_id}/verify/customer",
                            json={"token": "111111"}, headers=cust_headers)
    assert resp.status_code in (400, 429)
    # After 3 failed attempts, the 4th should be blocked as max-attempts exceeded
    resp2 = client.post(f"/api/v1/verification/{request_id}/verify/customer",
                         json={"token": "111111"}, headers=cust_headers)
    assert resp2.status_code == 429
    assert resp2.json()["error"]["code"] == "MAX_ATTEMPTS_EXCEEDED"


def test_customer_cannot_verify_someone_elses_request_token(client, seeded, db_session):
    from app.core.security import hash_password
    from app.models import User
    other_customer = User(full_name="Other Customer", email="other@test.com", phone="+915555555555",
                           password_hash=hash_password("Pass@1234"), role="CUSTOMER", status="ACTIVE")
    db_session.add(other_customer)
    db_session.commit()

    request_id, tokens, cust_headers, op_headers = _submit_and_generate(client, seeded)
    other_headers = auth_headers(client, "other@test.com")
    resp = client.post(f"/api/v1/verification/{request_id}/verify/customer",
                        json={"token": tokens["demo_customer_token"]}, headers=other_headers)
    assert resp.status_code == 403
