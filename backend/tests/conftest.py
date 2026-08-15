import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Use SQLite for fast, isolated test runs. (Production uses PostgreSQL —
# see docker-compose.yml / DATABASE_URL. SQLite is close enough for the
# app-level business logic under test here since we avoid Postgres-only types.)
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models import User, Branch, Locker
from app.main import app


@pytest.fixture(scope="function")
def db_session(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield session
    session.close()
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    # Swap the real Redis client for a lightweight in-memory fake so tests
    # don't require a running Redis instance.
    from app import core
    import app.services.verification_service as vs
    import app.middleware.rate_limit as rl

    class FakeRedis:
        def __init__(self):
            self.store = {}

        def setex(self, key, ttl, value):
            self.store[key] = str(value)

        def get(self, key):
            return self.store.get(key)

        def delete(self, *keys):
            for k in keys:
                self.store.pop(k, None)

        def incr(self, key):
            self.store[key] = str(int(self.store.get(key, 0)) + 1)
            return int(self.store[key])

        def expire(self, key, ttl):
            pass

        def ping(self):
            return True

    fake = FakeRedis()
    monkeypatch.setattr(vs, "redis_client", fake)
    monkeypatch.setattr(rl, "redis_client", fake)

    return TestClient(app)


@pytest.fixture
def seeded(db_session):
    branch = Branch(branch_code="BR-001", name="Test Branch", address="1 Test St", city="Testville", state="TS")
    db_session.add(branch)
    db_session.flush()

    customer = User(full_name="Test Customer", email="cust@test.com", phone="+911111111111",
                     password_hash=hash_password("Pass@1234"), role="CUSTOMER", status="ACTIVE")
    operator = User(full_name="Test Operator", email="op@test.com", phone="+912222222222",
                     password_hash=hash_password("Pass@1234"), role="BANK_OPERATOR", branch_id=branch.id, status="ACTIVE")
    manager = User(full_name="Test Manager", email="mgr@test.com", phone="+913333333333",
                    password_hash=hash_password("Pass@1234"), role="BRANCH_MANAGER", branch_id=branch.id, status="ACTIVE")
    admin = User(full_name="Test Admin", email="admin@test.com", phone="+914444444444",
                 password_hash=hash_password("Pass@1234"), role="SUPER_ADMIN", status="ACTIVE")
    db_session.add_all([customer, operator, manager, admin])
    db_session.flush()

    locker = Locker(branch_id=branch.id, locker_number="A1", locker_size="MEDIUM",
                     status="OCCUPIED", customer_id=customer.id)
    db_session.add(locker)
    db_session.commit()

    return {
        "branch": branch, "customer": customer, "operator": operator,
        "manager": manager, "admin": admin, "locker": locker,
    }


def auth_headers(client, email, password="Pass@1234"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
