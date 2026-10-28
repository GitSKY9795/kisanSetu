import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.types import UTCDateTime


class Buyer(Base):
    __tablename__ = "buyers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    organization: Mapped[str] = mapped_column(String, nullable=True)
    buyer_category: Mapped[str] = mapped_column(String, default="Wholesaler")
    # Retailer, Wholesaler, Processor, Institutional, Bulk
    phone: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    district: Mapped[str] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String, nullable=True)

    # Verification / trust fields — directly maps to PS requirement "verified buyers"
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    kyc_document_url: Mapped[str] = mapped_column(String, nullable=True)
    payment_reliability_score: Mapped[float] = mapped_column(default=0.0)

    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=datetime.utcnow)
