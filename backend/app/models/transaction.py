import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

ESCROW_STAGES = {
    1: ("FUNDS_ESCROWED", "FUNDS_LOCKED_IN_ESCROW", "READY_FOR_PICKUP"),
    2: ("DISPATCHED_IN_TRANSIT", "IN_TRANSIT", "DISPATCHED"),
    3: ("QUALITY_GATE_VERIFIED", "VERIFIED", "QUALITY_PASSED"),
    4: ("PAYOUT_DISBURSED", "PAID_RAZORPAY_SETTLED", "DELIVERED_AND_VERIFIED"),
}
STAGE_NAMES = {
    1: "Buyer Escrow Funded",
    2: "Dispatched / Logistics Pickup",
    3: "Gate Quality Verified",
    4: "Payout Released to Farmer",
}


class Transaction(Base):
    """Tracks a farmer<->buyer deal end to end through a 4-stage milestone escrow, incl.
    payment & dispute status (directly maps to PS requirement: 'secure transactions,
    payment tracking and dispute/grievance workflows')."""

    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_no: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    crop_listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crop_listings.id"), nullable=True
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmers.id"), nullable=False
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buyers.id"), nullable=False
    )

    crop_name: Mapped[str] = mapped_column(String, nullable=False)
    quality_grade: Mapped[str] = mapped_column(String, default="Grade A")
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    agreed_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    transport_cost: Mapped[float] = mapped_column(Float, default=0.0)
    storage_cost: Mapped[float] = mapped_column(Float, default=0.0)
    other_costs: Mapped[float] = mapped_column(Float, default=0.0)
    net_realization_per_kg: Mapped[float] = mapped_column(Float, nullable=True)

    escrow_stage: Mapped[int] = mapped_column(Integer, default=1)  # 1-4
    escrow_stage_label: Mapped[str] = mapped_column(String, default="FUNDS_ESCROWED")
    payment_status: Mapped[str] = mapped_column(String, default="FUNDS_LOCKED_IN_ESCROW")
    delivery_status: Mapped[str] = mapped_column(String, default="READY_FOR_PICKUP")
    razorpay_order_id: Mapped[str] = mapped_column(String, nullable=True)

    status: Mapped[str] = mapped_column(String, default="ESCROWED")  # ESCROWED/COMPLETED/DISPUTED

    stage_1_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.utcnow)
    stage_2_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    stage_3_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    stage_4_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    farmer: Mapped["Farmer"] = relationship("Farmer")  # noqa: F821
    buyer: Mapped["Buyer"] = relationship("Buyer")  # noqa: F821

    def stages_timeline(self) -> list[dict]:
        stage_at = {1: self.stage_1_at, 2: self.stage_2_at, 3: self.stage_3_at, 4: self.stage_4_at}
        return [
            {
                "stage": n,
                "name": STAGE_NAMES[n],
                "status": "COMPLETED" if n <= self.escrow_stage else "PENDING",
                "timestamp": stage_at[n].isoformat() if stage_at[n] else None,
            }
            for n in range(1, 5)
        ]
