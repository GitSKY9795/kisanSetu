import uuid
from datetime import datetime, timedelta

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UTCDateTime


class Grievance(Base):
    """Dispute/grievance ticket raised by a farmer or buyer against a transaction —
    directly maps to PS requirement: 'dispute or grievance processes ... transparent
    transaction records'."""

    __tablename__ = "grievances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticket_no: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True
    )
    raised_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    raised_by_type: Mapped[str] = mapped_column(String, nullable=False)  # FARMER / BUYER
    category: Mapped[str] = mapped_column(String, nullable=False)
    crop_name: Mapped[str] = mapped_column(String, nullable=True)
    disputed_amount_inr: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="UNDER_MEDIATION")
    # UNDER_MEDIATION, RESOLVED
    resolution_summary: Mapped[str] = mapped_column(String, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    sla_deadline: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.utcnow() + timedelta(hours=48)
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=datetime.utcnow)

    raised_by: Mapped["User"] = relationship("User")  # noqa: F821
    transaction: Mapped["Transaction | None"] = relationship("Transaction")  # noqa: F821
