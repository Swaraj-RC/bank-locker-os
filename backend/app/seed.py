"""
Seed script for Bank Locker OS with Project NPN Customers only.

Run with: python -m app.seed
Creates 1 main branch, clean lockers, demo staff accounts, and ONLY the 2 official
customers from Project NPN (customer001 and customer002) with active submitted requests
ready for operator web portal face verification.
"""
from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.core.enums import LockerSize, LockerStatus, RequestStatus, RequestType
from app.models import Branch, User, Locker, LockerRequest, AuditEvent, Notification

DEMO_PASSWORD = "Demo@1234"


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed():
    reset_db()
    db = SessionLocal()
    try:
        # --- Single Main Branch ---
        main_branch = Branch(
            id="branch-main-001",
            branch_code="BR-MAIN-001",
            name="Main Vault Branch",
            address="100 Financial District",
            city="Pune",
            state="Maharashtra",
            status="ACTIVE",
        )
        db.add(main_branch)
        db.flush()

        # --- Demo Staff Accounts ---
        demo_admin = User(
            id="admin001",
            full_name="System Administrator",
            email="admin@demo.bank",
            phone="+911000000001",
            password_hash=hash_password(DEMO_PASSWORD),
            role="SUPER_ADMIN",
            status="ACTIVE",
        )
        demo_manager = User(
            id="manager001",
            full_name="Anjali Rao",
            email="manager@demo.bank",
            phone="+911000000002",
            password_hash=hash_password(DEMO_PASSWORD),
            role="BRANCH_MANAGER",
            branch_id=main_branch.id,
            status="ACTIVE",
        )
        demo_operator = User(
            id="operator001",
            full_name="Rohan Mehta",
            email="operator@demo.bank",
            phone="+911000000003",
            password_hash=hash_password(DEMO_PASSWORD),
            role="BANK_OPERATOR",
            branch_id=main_branch.id,
            status="ACTIVE",
        )

        # --- ONLY Project NPN Customers ---
        cust001 = User(
            id="customer001",
            full_name="Customer 001",
            email="customer001@demo.bank",
            phone="+919000000001",
            password_hash=hash_password(DEMO_PASSWORD),
            role="CUSTOMER",
            status="ACTIVE",
        )
        cust002 = User(
            id="customer002",
            full_name="Customer 002",
            email="customer002@demo.bank",
            phone="+919000000002",
            password_hash=hash_password(DEMO_PASSWORD),
            role="CUSTOMER",
            status="ACTIVE",
        )

        db.add_all([demo_admin, demo_manager, demo_operator, cust001, cust002])
        db.flush()

        # --- Lockers ---
        locker1 = Locker(
            id="locker-001",
            branch_id=main_branch.id,
            locker_number="L-001",
            locker_size=LockerSize.MEDIUM.value,
            status=LockerStatus.OCCUPIED.value,
            customer_id=cust001.id,
            last_operation_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        locker2 = Locker(
            id="locker-002",
            branch_id=main_branch.id,
            locker_number="L-002",
            locker_size=LockerSize.LARGE.value,
            status=LockerStatus.OCCUPIED.value,
            customer_id=cust002.id,
            last_operation_at=datetime.now(timezone.utc) - timedelta(days=5),
        )
        db.add_all([locker1, locker2])

        # Add additional available lockers in vault grid
        available_lockers = []
        for i in range(3, 19):
            num_str = f"L-{i:03d}"
            size = LockerSize.SMALL.value if i % 3 == 0 else (LockerSize.LARGE.value if i % 3 == 1 else LockerSize.MEDIUM.value)
            loc = Locker(
                id=f"locker-{i:03d}",
                branch_id=main_branch.id,
                locker_number=num_str,
                locker_size=size,
                status=LockerStatus.AVAILABLE.value,
            )
            db.add(loc)
            available_lockers.append(loc)
        db.flush()

        # --- Active Locker Requests for Face Verification Demo ---
        now = datetime.now(timezone.utc)

        # Request 1 for Customer 001
        req1 = LockerRequest(
            id="req-cust001-access",
            locker_id=locker1.id,
            customer_id=cust001.id,
            request_type=RequestType.ACCESS.value,
            status=RequestStatus.SUBMITTED.value,
            requested_at=now - timedelta(minutes=10),
            correlation_id="corr-cust001-001",
        )
        db.add(req1)

        # Request 2 for Customer 002
        req2 = LockerRequest(
            id="req-cust002-access",
            locker_id=locker2.id,
            customer_id=cust002.id,
            request_type=RequestType.ACCESS.value,
            status=RequestStatus.SUBMITTED.value,
            requested_at=now - timedelta(minutes=5),
            correlation_id="corr-cust002-001",
        )
        db.add(req2)
        db.flush()

        # --- Audit Trail ---
        def make_audit(actor, action, entity_type, entity_id, prev, new, corr, when, metadata=None):
            e = AuditEvent(
                actor_id=actor.id if actor else None,
                actor_role=actor.role if actor else None,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                previous_state=prev,
                new_state=new,
                event_metadata=metadata or {},
                correlation_id=corr,
                created_at=when,
            )
            db.add(e)
            return e

        make_audit(demo_operator, "SYSTEM_INITIALIZED", "SYSTEM", "vault", None, "ONLINE", "init-001", now - timedelta(hours=1))
        make_audit(cust001, "REQUEST_SUBMITTED", "LOCKER_REQUEST", req1.id, None, "SUBMITTED", req1.correlation_id, req1.requested_at)
        make_audit(cust002, "REQUEST_SUBMITTED", "LOCKER_REQUEST", req2.id, None, "SUBMITTED", req2.correlation_id, req2.requested_at)

        # Staff login events
        for u in [demo_admin, demo_manager, demo_operator]:
            make_audit(u, "LOGIN_SUCCESS", "USER", u.id, None, None, None, now - timedelta(minutes=30))

        db.commit()
        print("==================================================================")
        print(" Database successfully seeded with Project NPN customers only!")
        print("==================================================================")
        print("  Customer 001: customer001@demo.bank  (Locker L-001, Request req-cust001-access)")
        print("  Customer 002: customer002@demo.bank  (Locker L-002, Request req-cust002-access)")
        print("  Staff Login:  operator@demo.bank (Password for all: Demo@1234)")
        print("  Admin Login:  admin@demo.bank    (Password for all: Demo@1234)")
        print("==================================================================")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
