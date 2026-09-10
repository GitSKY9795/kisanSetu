"""
Buyer Management, Purchase Requirements, & Offer Negotiation API Routes.
Supports buyer categories: Retailer, Wholesaler, Processor, Institutional Buyer, Bulk Buyer.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/buyers", tags=["buyers"])

BUYER_REQUIREMENTS_DB = [
    {
        "id": "req-201",
        "buyer_name": "AgriCorp Processing Ltd",
        "buyer_category": "Processor",
        "crop_name": "Wheat",
        "quantity_kg": 5000.0,
        "quality_grade": "Grade A",
        "target_price_per_kg": 26.0,
        "district": "Ujjain",
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": "req-202",
        "buyer_name": "FreshMarts Retail",
        "buyer_category": "Retailer",
        "crop_name": "Onion",
        "quantity_kg": 1500.0,
        "quality_grade": "Grade A",
        "target_price_per_kg": 34.0,
        "district": "Nashik",
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    },
]

OFFERS_DB = [
    {
        "id": "off-301",
        "buyer_name": "AgriCorp Processing Ltd",
        "target_listing_id": "list-101",
        "offered_price_per_kg": 25.50,
        "offered_quantity_kg": 500.0,
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
    }
]


class RequirementCreate(BaseModel):
    buyer_name: str
    buyer_category: str = "Wholesaler"  # Retailer, Wholesaler, Processor, Institutional, Bulk
    crop_name: str
    quantity_kg: float
    quality_grade: str = "Grade A"
    target_price_per_kg: float
    district: str = "Central"


class OfferCreate(BaseModel):
    buyer_name: str
    target_id: str
    offered_price_per_kg: float
    offered_quantity_kg: float


@router.get("/requirements")
def list_buyer_requirements(crop: str | None = None, category: str | None = None):
    """List purchase requirements posted by buyers."""
    results = BUYER_REQUIREMENTS_DB
    if crop:
        results = [r for r in results if r["crop_name"].lower() == crop.lower()]
    if category:
        results = [r for r in results if r["buyer_category"].lower() == category.lower()]
    return results


@router.post("/requirements")
def create_buyer_requirement(req: RequirementCreate):
    """Post a new crop purchase requirement."""
    new_req = {
        "id": f"req-{uuid.uuid4().hex[:6]}",
        "buyer_name": req.buyer_name,
        "buyer_category": req.buyer_category,
        "crop_name": req.crop_name,
        "quantity_kg": req.quantity_kg,
        "quality_grade": req.quality_grade,
        "target_price_per_kg": req.target_price_per_kg,
        "district": req.district,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat(),
    }
    BUYER_REQUIREMENTS_DB.append(new_req)
    return new_req


@router.get("/offers")
def list_buyer_offers():
    """List submitted negotiation offers."""
    return OFFERS_DB


@router.post("/offers")
def submit_buyer_offer(req: OfferCreate):
    """Submit a price/quantity offer to a farmer listing or FPO pool."""
    new_offer = {
        "id": f"off-{uuid.uuid4().hex[:6]}",
        "buyer_name": req.buyer_name,
        "target_id": req.target_id,
        "offered_price_per_kg": req.offered_price_per_kg,
        "offered_quantity_kg": req.offered_quantity_kg,
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
    }
    OFFERS_DB.append(new_offer)
    return new_offer
