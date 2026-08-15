"""
Seed script for demo/hackathon data.

Run with:  python -m app.seed
Creates 3 branches, 100+ lockers, 20+ customers, demo staff accounts, a
representative spread of request states, and a realistic audit trail so the
admin dashboard looks populated immediately after startup.
"""
import random
from datetime import datetime, timedelta, timezone

from faker import Faker

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password, hash_token
from app.core.enums import LockerSize, LockerStatus, RequestStatus, RequestType, TokenType, TokenStatus
from app.models import Branch, User, Locker, LockerRequest, VerificationToken, AuditEvent, Notification

fake = Faker()
random.seed(42)

DEMO_PASSWORD = "Demo@1234"

BRANCHES = [
    {"branch_code": "BR-PUN-001", "name": "Pune Camp Main Branch", "address": "12 MG Road", "city": "Pune", "state": "Maharashtra"},
    {"branch_code": "BR-MUM-002", "name": "Mumbai Fort Branch", "address": "45 Fort Street", "city": "Mumbai", "state": "Maharashtra"},
    {"branch_code": "BR-BLR-003", "name": "Bengaluru MG Road Branch", "address": "8 Brigade Road", "city": "Bengaluru", "state": "Karnataka"},
]

LOCKER_SIZES = [LockerSize.SMALL.value, LockerSize.MEDIUM.value, LockerSize.LARGE.value, LockerSize.EXTRA_LARGE.value]
ROWS = "ABCDEFG"


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed():
    reset_db()
    db = SessionLocal()
    try:
        # --- Branches ---
        branches = []
        for b in BRANCHES:
            branch = Branch(**b, status="ACTIVE")
            db.add(branch)
            branches.append(branch)
        db.flush()

        # --- Demo staff accounts (documented, dev-only passwords) ---
        demo_admin = User(
            full_name="System Administrator", email="admin@demo.bank", phone="+911000000001",
            password_hash=hash_password(DEMO_PASSWORD), role="SUPER_ADMIN", status="ACTIVE",
        )
        demo_manager = User(
            full_name="Anjali Rao", email="manager@demo.bank", phone="+911000000002",
            password_hash=hash_password(DEMO_PASSWORD), role="BRANCH_MANAGER", branch_id=branches[0].id, status="ACTIVE",
        )
        demo_operator = User(
            full_name="Rohan Mehta", email="operator@demo.bank", phone="+911000000003",
            password_hash=hash_password(DEMO_PASSWORD), role="BANK_OPERATOR", branch_id=branches[0].id, status="ACTIVE",
        )
        demo_customer = User(
            full_name="Priya Sharma", email="customer@demo.bank", phone="+911000000004",
            password_hash=hash_password(DEMO_PASSWORD), role="CUSTOMER", status="ACTIVE",
        )
        db.add_all([demo_admin, demo_manager, demo_operator, demo_customer])
        db.flush()

        # --- Additional operators/managers per branch ---
        staff = [demo_manager, demo_operator]
        for branch in branches:
            for _ in range(2):
                op_user = User(
                    full_name=fake.name(), email=fake.unique.email(), phone=f"+9198{random.randint(10000000,99999999)}",
                    password_hash=hash_password(DEMO_PASSWORD), role="BANK_OPERATOR", branch_id=branch.id, status="ACTIVE",
                )
                db.add(op_user)
                staff.append(op_user)
        db.flush()

        # --- Customers (20+) ---
        customers = [demo_customer]
        for _ in range(24):
            c = User(
                full_name=fake.name(), email=fake.unique.email(), phone=f"+9197{random.randint(10000000,99999999)}",
                password_hash=hash_password(DEMO_PASSWORD), role="CUSTOMER", status="ACTIVE",
            )
            db.add(c)
            customers.append(c)
        db.flush()

        # --- Lockers (100+, distributed across branches, various sizes) ---
        lockers = []
        for branch in branches:
            for row in ROWS:
                for num in range(1, 7):  # 7 rows x 6 = 42 per branch => 126 total
                    locker = Locker(
                        branch_id=branch.id,
                        locker_number=f"{row}{num}",
                        locker_size=random.choice(LOCKER_SIZES),
                        status=LockerStatus.AVAILABLE.value,
                    )
                    db.add(locker)
                    lockers.append(locker)
        db.flush()

        # Assign ~60% of lockers to customers as OCCUPIED
        assignable = random.sample(lockers, k=int(len(lockers) * 0.6))
        cust_cycle = customers[1:] * 5  # spread across generated customers
        random.shuffle(cust_cycle)
        for i, locker in enumerate(assignable):
            cust = cust_cycle[i % len(cust_cycle)]
            locker.customer_id = cust.id
            locker.status = LockerStatus.OCCUPIED.value
            locker.last_operation_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 90))

        # Ensure the demo customer has a fixed, memorable locker for the judge demo
        demo_locker = next(l for l in lockers if l.branch_id == branches[0].id and l.locker_number == "A1")
        demo_locker.customer_id = demo_customer.id
        demo_locker.status = LockerStatus.OCCUPIED.value
        demo_locker.last_operation_at = datetime.now(timezone.utc) - timedelta(days=14)

        # A few in MAINTENANCE / RESTRICTED for realism
        for locker in random.sample(lockers, k=5):
            locker.status = LockerStatus.MAINTENANCE.value
        for locker in random.sample(lockers, k=3):
            locker.status = LockerStatus.RESTRICTED.value

        db.flush()

        # --- Requests across a representative spread of states ---
        occupied_lockers = [l for l in lockers if l.status == "OCCUPIED" and l.customer_id]

        def make_audit(actor, action, entity_type, entity_id, prev, new, corr, when, metadata=None):
            e = AuditEvent(
                actor_id=actor.id if actor else None, actor_role=actor.role if actor else None,
                action=action, entity_type=entity_type, entity_id=entity_id,
                previous_state=prev, new_state=new, event_metadata=metadata or {},
                correlation_id=corr, created_at=when,
            )
            db.add(e)
            return e

        sample_pool = random.sample(occupied_lockers, k=min(18, len(occupied_lockers)))
        state_targets = (
            ["SUBMITTED"] * 3 + ["VERIFICATION_PENDING"] * 3 + ["APPROVED"] * 2 +
            ["ACCESS_ACTIVE"] * 2 + ["COMPLETED"] * 5 + ["REJECTED"] * 2 + ["CANCELLED"] * 1
        )
        for locker, target_state in zip(sample_pool, state_targets):
            operator = random.choice(staff)
            requested_at = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 240))
            req = LockerRequest(
                locker_id=locker.id, customer_id=locker.customer_id,
                request_type=random.choice([RequestType.ACCESS.value, RequestType.INSPECTION.value]),
                status=target_state, requested_at=requested_at,
            )
            db.add(req)
            db.flush()
            corr = req.correlation_id

            make_audit(None, "REQUEST_SUBMITTED", "LOCKER_REQUEST", req.id, None, "SUBMITTED", corr, requested_at)

            if target_state in ("VERIFICATION_PENDING", "APPROVED", "ACCESS_ACTIVE", "COMPLETED"):
                t = requested_at + timedelta(minutes=5)
                make_audit(operator, "VERIFICATION_TOKENS_GENERATED", "LOCKER_REQUEST", req.id, "SUBMITTED", "VERIFICATION_PENDING", corr, t)

            if target_state in ("APPROVED", "ACCESS_ACTIVE", "COMPLETED"):
                t = requested_at + timedelta(minutes=10)
                make_audit(operator, "ACCESS_AUTHORIZED", "LOCKER_REQUEST", req.id, "TOKEN_B_VERIFIED", "APPROVED", corr, t)
                req.approved_by = operator.id

            if target_state in ("ACCESS_ACTIVE", "COMPLETED"):
                t = requested_at + timedelta(minutes=12)
                make_audit(operator, "LOCKER_STATE_CHANGED", "LOCKER", locker.id, "VERIFICATION_PENDING", "ACCESS_ACTIVE", corr, t)

            if target_state == "COMPLETED":
                t = requested_at + timedelta(minutes=25)
                req.completed_at = t
                make_audit(operator, "OPERATION_COMPLETED", "LOCKER_REQUEST", req.id, "ACCESS_ACTIVE", "COMPLETED", corr, t)
                make_audit(operator, "LOCKER_STATE_CHANGED", "LOCKER", locker.id, "ACCESS_ACTIVE", "OCCUPIED", corr, t)

            if target_state == "REJECTED":
                req.rejection_reason = random.choice([
                    "Signature mismatch during verification",
                    "Customer unable to complete identity check",
                    "Duplicate request already in progress",
                ])
                t = requested_at + timedelta(minutes=8)
                make_audit(operator, "REQUEST_STATE_CHANGED", "LOCKER_REQUEST", req.id, "SUBMITTED", "REJECTED", corr, t,
                           metadata={"reason": req.rejection_reason})

            if target_state == "CANCELLED":
                t = requested_at + timedelta(minutes=3)
                make_audit(None, "REQUEST_STATE_CHANGED", "LOCKER_REQUEST", req.id, "SUBMITTED", "CANCELLED", corr, t)

        # A pending request specifically for the demo customer's demo locker,
        # ready for the judge to walk through the dual-token flow live.
        demo_req = LockerRequest(
            locker_id=demo_locker.id, customer_id=demo_customer.id,
            request_type=RequestType.ACCESS.value, status=RequestStatus.SUBMITTED.value,
            requested_at=datetime.now(timezone.utc) - timedelta(minutes=2),
        )
        db.add(demo_req)
        db.flush()
        make_audit(demo_customer, "REQUEST_SUBMITTED", "LOCKER_REQUEST", demo_req.id, None, "SUBMITTED",
                   demo_req.correlation_id, demo_req.requested_at)

        # --- Login history for realism ---
        for u in [demo_admin, demo_manager, demo_operator, demo_customer]:
            make_audit(u, "LOGIN_SUCCESS", "USER", u.id, None, None, None,
                       datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48)))

        # --- Sample notifications for the demo customer ---
        db.add_all([
            Notification(user_id=demo_customer.id, title="Locker request submitted",
                         message="Your access request for locker A1 has been submitted and is awaiting verification.",
                         type="REQUEST_UPDATE"),
            Notification(user_id=demo_customer.id, title="Welcome to Digital Locker Services",
                         message="You can now manage your locker access digitally from this app.",
                         type="SYSTEM", read=True),
        ])

        db.commit()
        print(f"Seeded {len(branches)} branches, {len(lockers)} lockers, {len(customers)} customers, "
              f"{len(staff)} staff, {len(sample_pool) + 1} requests.")
        print("\nDemo accounts (password for all: %s):" % DEMO_PASSWORD)
        print("  Customer:       customer@demo.bank")
        print("  Bank Operator:  operator@demo.bank")
        print("  Branch Manager: manager@demo.bank")
        print("  Super Admin:    admin@demo.bank")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
