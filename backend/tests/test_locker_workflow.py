from tests.conftest import auth_headers


def test_create_request_success(client, seeded):
    headers = auth_headers(client, "cust@test.com")
    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id, "request_type": "ACCESS"}, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["data"]["status"] == "SUBMITTED"


def test_duplicate_request_rejected(client, seeded):
    headers = auth_headers(client, "cust@test.com")
    client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=headers)
    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "DUPLICATE_REQUEST"


def test_request_on_unowned_locker_rejected(client, seeded, db_session):
    from app.models import Locker
    other_locker = Locker(branch_id=seeded["branch"].id, locker_number="Z9", locker_size="SMALL", status="AVAILABLE")
    db_session.add(other_locker)
    db_session.commit()

    headers = auth_headers(client, "cust@test.com")
    resp = client.post("/api/v1/requests", json={"locker_id": other_locker.id}, headers=headers)
    assert resp.status_code == 403


def test_request_on_maintenance_locker_rejected(client, seeded, db_session):
    seeded["locker"].status = "MAINTENANCE"
    db_session.commit()
    headers = auth_headers(client, "cust@test.com")
    resp = client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "LOCKER_UNAVAILABLE"


def test_invalid_state_transition_rejected(client, seeded, db_session):
    """A COMPLETED request cannot be approved again — the state machine must reject it."""
    from app.models import LockerRequest
    req = LockerRequest(locker_id=seeded["locker"].id, customer_id=seeded["customer"].id, status="COMPLETED")
    db_session.add(req)
    db_session.commit()

    headers = auth_headers(client, "op@test.com")
    resp = client.post(f"/api/v1/admin/requests/{req.id}/approve", headers=headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_STATE_TRANSITION"
