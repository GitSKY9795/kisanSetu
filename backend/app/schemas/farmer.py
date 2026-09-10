import uuid

from pydantic import BaseModel


class FarmerCreate(BaseModel):
    name: str
    phone: str
    preferred_language: str = "hi"
    village: str | None = None
    district: str | None = None
    state: str | None = None
    storage_capacity_kg: float | None = None


class FarmerOut(FarmerCreate):
    id: uuid.UUID

    class Config:
        from_attributes = True
