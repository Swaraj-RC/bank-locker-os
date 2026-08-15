from tests.conftest import auth_headers


def test_login_generates_audit_event(client, seeded, db_session):
    auth_headers(client, "cust@test.com")
    from app.models import AuditEvent
    events = db_session.query(AuditEvent).filter(AuditEvent.action == "LOGIN_SUCCESS").all()
    assert len(events) >= 1


def test_request_submission_generates_audit_event(client, seeded, db_session):
    headers = auth_headers(client, "cust@test.com")
    client.post("/api/v1/requests", json={"locker_id": seeded["locker"].id}, headers=headers)
    from app.models import AuditEvent
    events = db_session.query(AuditEvent).filter(AuditEvent.action == "REQUEST_SUBMITTED").all()
    assert len(events) == 1


def test_audit_endpoint_requires_staff(client, seeded):
    headers = auth_headers(client, "cust@test.com")
    resp = client.get("/api/v1/audit", headers=headers)
    assert resp.status_code == 403


def test_audit_endpoint_returns_events_for_staff(client, seeded):
    headers = auth_headers(client, "admin@test.com")
    resp = client.get("/api/v1/audit", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True
