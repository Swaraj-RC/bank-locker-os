"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-13

"""
from alembic import op
import sqlalchemy as sa
# String(36) UUID PKs keep this schema portable across Postgres/SQLite

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "branches",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("branch_code", sa.String(20), nullable=False, unique=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("address", sa.String(255), nullable=False),
        sa.Column("city", sa.String(80), nullable=False),
        sa.Column("state", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("phone", sa.String(20), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(30), nullable=False, server_default="CUSTOMER"),
        sa.Column("branch_id", sa.String(36), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "lockers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("branch_id", sa.String(36), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("locker_number", sa.String(20), nullable=False),
        sa.Column("locker_size", sa.String(20), nullable=False, server_default="MEDIUM"),
        sa.Column("status", sa.String(30), nullable=False, server_default="AVAILABLE"),
        sa.Column("customer_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("last_operation_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("branch_id", "locker_number", name="uq_branch_locker_number"),
    )
    op.create_index("ix_lockers_status", "lockers", ["status"])

    op.create_table(
        "locker_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("locker_id", sa.String(36), sa.ForeignKey("lockers.id"), nullable=False),
        sa.Column("customer_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("request_type", sa.String(20), nullable=False, server_default="ACCESS"),
        sa.Column("status", sa.String(30), nullable=False, server_default="SUBMITTED"),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("correlation_id", sa.String(36), nullable=False),
    )
    op.create_index("ix_requests_status", "locker_requests", ["status"])
    op.create_index("ix_requests_requested_at", "locker_requests", ["requested_at"])
    op.create_index("ix_requests_correlation_id", "locker_requests", ["correlation_id"])

    op.create_table(
        "verification_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("request_id", sa.String(36), sa.ForeignKey("locker_requests.id"), nullable=False),
        sa.Column("token_type", sa.String(20), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("actor_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("actor_role", sa.String(30), nullable=True),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("entity_type", sa.String(40), nullable=False),
        sa.Column("entity_id", sa.String(64), nullable=True),
        sa.Column("previous_state", sa.String(40), nullable=True),
        sa.Column("new_state", sa.String(40), nullable=True),
        sa.Column("event_metadata", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("correlation_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_created_at", "audit_events", ["created_at"])
    op.create_index("ix_audit_actor", "audit_events", ["actor_id"])
    op.create_index("ix_audit_entity", "audit_events", ["entity_type", "entity_id"])
    op.create_index("ix_audit_correlation_id", "audit_events", ["correlation_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(30), nullable=False, server_default="SYSTEM"),
        sa.Column("read", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("audit_events")
    op.drop_table("verification_tokens")
    op.drop_table("locker_requests")
    op.drop_table("lockers")
    op.drop_table("users")
    op.drop_table("branches")
