import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    supabase_user_id: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String, default="hi")  # BHASHINI lang code
    village: Mapped[str] = mapped_column(String, nullable=True)
    district: Mapped[str] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String, nullable=True)
    latitude: Mapped[float] = mapped_column(nullable=True)
    longitude: Mapped[float] = mapped_column(nullable=True)
    storage_capacity_kg: Mapped[float] = mapped_column(nullable=True)

    fpo_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpos.id"), nullable=True
    )
    fpo: Mapped["FPO | None"] = relationship("FPO", back_populates="farmers")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
