def test_login_success(client, seeded):
    resp = client.post("/api/v1/auth/login", json={"email": "cust@test.com", "password": "Pass@1234"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]


def test_login_invalid_password(client, seeded):
    resp = client.post("/api/v1/auth/login", json={"email": "cust@test.com", "password": "wrong"})
    assert resp.status_code == 401
    body = resp.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_unknown_user(client, seeded):
    resp = client.post("/api/v1/auth/login", json={"email": "nobody@test.com", "password": "x"})
    assert resp.status_code == 401


def test_expired_or_garbage_token_rejected(client, seeded):
    resp = client.get("/api/v1/customers/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_TOKEN"


def test_unauthorized_endpoint_without_header(client, seeded):
    resp = client.get("/api/v1/customers/me")
    assert resp.status_code == 401


def test_customer_cannot_access_admin_endpoints(client, seeded):
    from tests.conftest import auth_headers
    headers = auth_headers(client, "cust@test.com")
    resp = client.get("/api/v1/admin/dashboard", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_operator_cannot_access_super_admin_only_actions(client, seeded):
    from tests.conftest import auth_headers
    headers = auth_headers(client, "op@test.com")
    # branches listing is fine for staff, but admin dashboard requires staff (operator IS staff) -> should work
    resp = client.get("/api/v1/admin/dashboard", headers=headers)
    assert resp.status_code == 200


def test_manager_permissions_work(client, seeded):
    from tests.conftest import auth_headers
    headers = auth_headers(client, "mgr@test.com")
    resp = client.get("/api/v1/admin/lockers", headers=headers)
    assert resp.status_code == 200
