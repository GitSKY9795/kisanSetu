import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MarketPrice(Base):
    """Historical & live mandi prices for price discovery."""

    __tablename__ = "market_prices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    crop_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    mandi_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    district: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    modal_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    min_price_per_kg: Mapped[float] = mapped_column(Float, nullable=True)
    max_price_per_kg: Mapped[float] = mapped_column(Float, nullable=True)
    arrivals_tonnes: Mapped[float] = mapped_column(Float, nullable=True)
    price_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class MarketDemand(Base):
    """Market demand indicators for crops."""

    __tablename__ = "market_demand"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    crop_name: Mapped[str] = mapped_column(String, index=True, nullable=False)
    district: Mapped[str] = mapped_column(String, nullable=False)
    demand_level: Mapped[str] = mapped_column(String, default="MEDIUM")  # HIGH, MEDIUM, LOW
    volume_index: Mapped[float] = mapped_column(Float, default=1.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BuyerRequirement(Base):
    """Specific purchase requirements posted by buyers."""

    __tablename__ = "buyer_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buyers.id"), nullable=False
    )
    crop_name: Mapped[str] = mapped_column(String, nullable=False)
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    quality_grade: Mapped[str] = mapped_column(String, default="A")
    target_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_location: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="ACTIVE")  # ACTIVE, FULFILLED, CLOSED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Offer(Base):
    """Negotiation offer between buyer and seller/FPO."""

    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buyers.id"), nullable=False
    )
    crop_listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crop_listings.id"), nullable=True
    )
    fpo_pool_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpo_pools.id"), nullable=True
    )
    offered_price_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    offered_quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String, default="PENDING")  # PENDING, ACCEPTED, REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
