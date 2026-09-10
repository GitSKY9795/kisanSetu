"""
AI Sell Decision & Net Realization Comparison API Routes.
"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.decision_engine import recommend_action
from app.services.net_realization import compare_buyer_offers

router = APIRouter(prefix="/decision", tags=["decision"])


class DirectDecisionRequest(BaseModel):
    crop_name: str = "Wheat"
    current_price_per_kg: float = 24.50
    quantity_kg: float = 500.0
    storage_capacity_kg: float = 600.0
    transport_cost_per_kg: float = 1.0
    storage_cost_per_kg: float = 0.5
    district: str = "Ujjain"


class OfferCompareRequest(BaseModel):
    quantity_kg: float = 1000.0
    offers: list[dict]


@router.post("/recommend")
def get_sell_recommendation(req: DirectDecisionRequest):
    """Generates SELL NOW / WAIT / STORE / AGGREGATE decision with confidence and reasons."""
    return recommend_action(
        crop_name=req.crop_name,
        current_price_per_kg=req.current_price_per_kg,
        quantity_kg=req.quantity_kg,
        storage_capacity_kg=req.storage_capacity_kg,
        transport_cost_per_kg=req.transport_cost_per_kg,
        storage_cost_per_kg=req.storage_cost_per_kg,
        district=req.district,
    )


@router.post("/compare-net-realization")
def compare_offers_net_realization(req: OfferCompareRequest):
    """Calculates expected net realization across buyer offers and ranks them."""
    return compare_buyer_offers(offers=req.offers, quantity_kg=req.quantity_kg)
