"""add_rating_to_job_offers

Revision ID: 9ed5764f68b4
Revises: 7a8e9d1c2b3a
Create Date: 2026-11-04 20:42:52.366391

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ed5764f68b4'
down_revision: Union[str, Sequence[str], None] = '7a8e9d1c2b3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'job_offers',
        sa.Column('rating', sa.Integer(), server_default='1', nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('job_offers', 'rating')

