import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Transaction(Base):
    """Tracks a farmer<->buyer deal end to end, incl. payment & dispute status
    (directly maps to PS requirement: 'secure transactions, payment tracking and
    dispute/grievance workflows')."""

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    crop_listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crop_listings.id"), nullable=False
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmers.id"), nullable=False
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buyers.id"), nullable=False
    )

    agreed_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    transport_cost: Mapped[float] = mapped_column(Float, default=0.0)
    storage_cost: Mapped[float] = mapped_column(Float, default=0.0)
    other_costs: Mapped[float] = mapped_column(Float, default=0.0)
    net_realization_per_kg: Mapped[float] = mapped_column(Float, nullable=True)

    payment_status: Mapped[str] = mapped_column(String, default="PENDING")  # PENDING/PAID/DISPUTED
    razorpay_order_id: Mapped[str] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(String, default="OFFERED")  # OFFERED/ACCEPTED/DELIVERED/COMPLETED/DISPUTED

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
