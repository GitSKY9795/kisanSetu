import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CropListing(Base):
    """A farmer's produce lot available for sale — the unit the Sell-Decision AI reasons about,
    and the unit buyers browse/offer on in the Marketplace."""

    __tablename__ = "crop_listings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmers.id"), nullable=False
    )
    farmer: Mapped["Farmer"] = relationship()  # noqa: F821

    crop_name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Onion", "Cotton"
    variety: Mapped[str] = mapped_column(String, default="Standard")
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)  # farmer's asking price
    quality_grade: Mapped[str] = mapped_column(String, default="Grade A")  # from YOLOv8 grading
    district: Mapped[str] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String, nullable=True)
    storage_available_kg: Mapped[float] = mapped_column(Float, default=0.0)
    harvest_date: Mapped[str] = mapped_column(String, nullable=True)

    # Latest AI recommendation snapshot (also computed live via /decision)
    recommended_action: Mapped[str] = mapped_column(String, nullable=True)  # SELL/WAIT/STORE/AGGREGATE
    confidence_score: Mapped[float] = mapped_column(Float, nullable=True)

    status: Mapped[str] = mapped_column(String, default="LISTED")  # LISTED / MATCHED / SOLD

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
