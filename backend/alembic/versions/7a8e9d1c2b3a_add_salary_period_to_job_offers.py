"""add_salary_period_to_job_offers

Revision ID: 7a8e9d1c2b3a
Revises: 09554bd063f3
Create Date: 2026-11-02 20:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8e9d1c2b3a'
down_revision: Union[str, Sequence[str], None] = '09554bd063f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'job_offers',
        sa.Column('salary_period', sa.String(length=20), server_default='month', nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('job_offers', 'salary_period')
