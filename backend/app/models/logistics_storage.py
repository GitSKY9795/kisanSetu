import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StorageUnit(Base):
    """Warehouse / Cold storage facility for crop preservation."""

    __tablename__ = "storage_units"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    facility_type: Mapped[str] = mapped_column(String, default="WAREHOUSE")  # COLD_STORAGE, WAREHOUSE
    district: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    available_kg: Mapped[float] = mapped_column(Float, nullable=False)
    cost_per_kg_per_day: Mapped[float] = mapped_column(Float, default=0.5)
    contact_phone: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LogisticsRoute(Base):
    """Calculated transport route and cost estimation."""

    __tablename__ = "logistics_routes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    origin_district: Mapped[str] = mapped_column(String, nullable=False)
    destination_district: Mapped[str] = mapped_column(String, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_cost_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    transit_hours: Mapped[float] = mapped_column(Float, default=12.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
