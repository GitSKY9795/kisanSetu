import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FPO(Base):
    """Farmer Producer Organisation — enables lot aggregation for stronger bargaining power."""

    __tablename__ = "fpos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    registration_id: Mapped[str] = mapped_column(String, nullable=True)
    district: Mapped[str] = mapped_column(String, nullable=True)
    state: Mapped[str] = mapped_column(String, nullable=True)
    contact_phone: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    farmers: Mapped[list["Farmer"]] = relationship("Farmer", back_populates="fpo")
    pools: Mapped[list["FPOPool"]] = relationship("FPOPool", back_populates="fpo")


class FPOPool(Base):
    """Aggregated produce lot created by an FPO combining multiple farmer contributions."""

    __tablename__ = "fpo_pools"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    fpo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpos.id"), nullable=False
    )
    crop_name: Mapped[str] = mapped_column(String, nullable=False)
    variety: Mapped[str] = mapped_column(String, nullable=True)
    total_quantity_kg: Mapped[float] = mapped_column(Float, default=0.0)
    target_price_per_kg: Mapped[float] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="OPEN")  # OPEN, MATCHED, SOLD
    district: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    fpo: Mapped[FPO] = relationship("FPO", back_populates="pools")
    members: Mapped[list["FPOPoolMember"]] = relationship("FPOPoolMember", back_populates="pool")


class FPOPoolMember(Base):
    """Tracks individual farmer contributions to an FPO produce pool."""

    __tablename__ = "fpo_pool_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pool_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("fpo_pools.id"), nullable=False
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("farmers.id"), nullable=False
    )
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pool: Mapped[FPOPool] = relationship("FPOPool", back_populates="members")
