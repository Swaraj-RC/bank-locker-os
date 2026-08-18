"""Add face_verifications table

Revision ID: 0002_face_verifications
Revises: 0001_initial
Create Date: 2026-08-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_face_verifications"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "face_verifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("request_id", sa.String(36), sa.ForeignKey("locker_requests.id"), nullable=False),
        sa.Column("actor_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("actor_role", sa.String(30), nullable=False),
        sa.Column("face_match", sa.Boolean(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("liveness_passed", sa.Boolean(), nullable=False),
        sa.Column("spoof_probability", sa.Float(), nullable=False),
        # Structured AI output — not the raw image bytes.
        sa.Column("raw_response", sa.JSON(), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_face_verifications_request_id", "face_verifications", ["request_id"])
    op.create_index("ix_face_verifications_actor_id", "face_verifications", ["actor_id"])


def downgrade() -> None:
    op.drop_index("ix_face_verifications_actor_id", table_name="face_verifications")
    op.drop_index("ix_face_verifications_request_id", table_name="face_verifications")
    op.drop_table("face_verifications")
