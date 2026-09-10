import uuid

from pydantic import BaseModel


class DecisionRequest(BaseModel):
    crop_name: str
    quantity_kg: float
    district: str
    state: str
    storage_capacity_kg: float | None = 0
    farmer_id: uuid.UUID | None = None


class DecisionResponse(BaseModel):
    action: str  # SELL_NOW | WAIT | STORE | AGGREGATE
    confidence: float  # 0-1
    current_price_per_kg: float
    predicted_price_per_kg_7d: float
    net_realization_per_kg: float
    reasoning: str


class TransactionCreate(BaseModel):
    crop_listing_id: uuid.UUID
    farmer_id: uuid.UUID
    buyer_id: uuid.UUID
    agreed_price_per_kg: float
    transport_cost: float = 0.0
    storage_cost: float = 0.0
    other_costs: float = 0.0


class TransactionOut(TransactionCreate):
    id: uuid.UUID
    net_realization_per_kg: float | None
    payment_status: str
    status: str

    class Config:
        from_attributes = True
