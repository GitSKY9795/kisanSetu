import uuid

from pydantic import BaseModel


class BuyerCreate(BaseModel):
    name: str
    organization: str | None = None
    phone: str
    district: str | None = None
    state: str | None = None


class BuyerOut(BuyerCreate):
    id: uuid.UUID
    is_verified: bool
    payment_reliability_score: float

    class Config:
        from_attributes = True
