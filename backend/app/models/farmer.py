import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String, default="hi")  # BHASHINI lang code
    village: Mapped[str] = mapped_column(String, nullable=True)
    district: Mapped[str] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String, nullable=True)
    pin_code: Mapped[str] = mapped_column(String, nullable=True)
    farmer_type: Mapped[str] = mapped_column(String, nullable=True)  # Land Owner / Tenant
    land_area: Mapped[float] = mapped_column(Float, nullable=True)  # acres
    main_crops: Mapped[str] = mapped_column(String, nullable=True)
    latitude: Mapped[float] = mapped_column(nullable=True)
    longitude: Mapped[float] = mapped_column(nullable=True)
    storage_capacity_kg: Mapped[float] = mapped_column(nullable=True)

    fpo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpos.id"), nullable=True
    )
    fpo: Mapped["FPO | None"] = relationship("FPO", back_populates="farmers")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
