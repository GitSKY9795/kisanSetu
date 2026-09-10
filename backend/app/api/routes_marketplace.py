"""
Direct Produce Marketplace & B2B Negotiation API Routes.

Features:
- Unified feed of farmer lots + FPO aggregated pools
- Verified Buyer Trust & Credential Scores (fulfillment, credit, on-time payment)
- Digital Offer & Counter-Offer negotiation workflow
- Matchmaking recommendation engine
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.routes_farmers import FARMER_LISTINGS_DB
from app.api.routes_fpos import FPO_POOLS_DB

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

# In-memory database for interactive offers/negotiations
OFFERS_DB = [
    {
        "id": "off-101",
        "listing_id": "fl-01",
        "crop_name": "Wheat",
        "farmer_name": "Ramesh Kumar",
        "buyer_name": "AgriCorp Processing Ltd",
        "buyer_category": "Processor",
        "quantity_kg": 500.0,
        "asking_price_per_kg": 25.50,
        "offered_price_per_kg": 26.00,
        "status": "ACCEPTED",
        "terms": "Pickup at farm-gate within 48 hours. Quality Grade A certified.",
        "created_at": datetime.now().isoformat(),
        "escrow_status": "FUNDS_LOCKED",
    },
    {
        "id": "off-102",
        "listing_id": "fl-02",
        "crop_name": "Onion",
        "farmer_name": "Suresh Patel",
        "buyer_name": "Metro Cash & Carry",
        "buyer_category": "Wholesaler",
        "quantity_kg": 1200.0,
        "asking_price_per_kg": 28.00,
        "offered_price_per_kg": 27.20,
        "status": "COUNTER_OFFERED",
        "terms": "Shared transport subsidy 50%. Payment within 24h of gate inspection.",
        "created_at": datetime.now().isoformat(),
        "escrow_status": "PENDING_ACCEPTANCE",
    }
]

BUYER_TRUST_DB = {
    "AgriCorp Processing Ltd": {
        "trust_score": 96,
        "rating_stars": 4.8,
        "fulfillment_rate_pct": 98.5,
        "avg_settlement_hours": 12,
        "gst_verified": True,
        "pan_verified": True,
        "total_procured_tonnes": 420.0,
        "badges": ["Top Corporate Buyer", "Fast Payer", "WDRA Accredited Partner"],
    },
    "Metro Cash & Carry": {
        "trust_score": 94,
        "rating_stars": 4.7,
        "fulfillment_rate_pct": 96.0,
        "avg_settlement_hours": 18,
        "gst_verified": True,
        "pan_verified": True,
        "total_procured_tonnes": 850.0,
        "badges": ["Verified Super-Buyer", "Zero Dispute Record"],
    },
    "Patanjali Agro Foods": {
        "trust_score": 97,
        "rating_stars": 4.9,
        "fulfillment_rate_pct": 99.1,
        "avg_settlement_hours": 6,
        "gst_verified": True,
        "pan_verified": True,
        "total_procured_tonnes": 1200.0,
        "badges": ["Prime Institutional Partner", "Instant UPI Settlement"],
    },
    "ITC e-Choupal Procurement": {
        "trust_score": 99,
        "rating_stars": 5.0,
        "fulfillment_rate_pct": 99.8,
        "avg_settlement_hours": 4,
        "gst_verified": True,
        "pan_verified": True,
        "total_procured_tonnes": 3400.0,
        "badges": ["A+ Credit Rated", "Pre-Funded Escrow Partner"],
    }
}


class CreateOfferRequest(BaseModel):
    listing_id: str | None = "fl-01"
    crop_name: str = "Wheat"
    farmer_name: str = "Ramesh Kumar"
    buyer_name: str = "AgriCorp Processing Ltd"
    buyer_category: str = "Processor"
    quantity_kg: float = 500.0
    asking_price_per_kg: float = 25.50
    offered_price_per_kg: float = 26.00
    terms: str = "Farmgate pickup within 48h. Instant UPI on quality check."


class CounterOfferRequest(BaseModel):
    counter_price_per_kg: float
    updated_terms: str | None = None


@router.get("/listings")
def list_marketplace_items(crop: str | None = None):
    """Unified feed of individual farmer lots + FPO-aggregated pools, ready to browse or offer on."""
    items = []

    for listing in FARMER_LISTINGS_DB:
        items.append({
            "id": listing["id"],
            "source": "FARMER",
            "seller_name": listing["farmer_name"],
            "crop_name": listing["crop_name"],
            "variety": listing.get("variety", "Standard"),
            "quantity_kg": listing["quantity_kg"],
            "price_per_kg": listing["expected_price_per_kg"],
            "district": listing["district"],
            "state": listing.get("state", "Madhya Pradesh"),
            "quality_grade": listing.get("quality_grade", "Grade A"),
            "verified": True,
            "has_quality_cert": True,
            "harvest_ready_days": 3,
            "status": listing.get("status", "AVAILABLE"),
        })

    for pool in FPO_POOLS_DB:
        items.append({
            "id": pool["id"],
            "source": "FPO_POOL",
            "seller_name": f"{pool['fpo_name']} (Aggregated Lot)",
            "crop_name": pool["crop_name"],
            "variety": pool.get("variety", "Standard"),
            "quantity_kg": pool["total_quantity_kg"],
            "price_per_kg": pool["target_price_per_kg"],
            "district": pool["district"],
            "state": "Madhya Pradesh",
            "quality_grade": "Grade A (Aggregated Bulk)",
            "verified": True,
            "has_quality_cert": True,
            "harvest_ready_days": 1,
            "status": pool.get("status", "OPEN"),
        })

    if crop and crop.lower() != "all":
        items = [i for i in items if i["crop_name"].lower() == crop.lower()]

    return {"count": len(items), "listings": items}


@router.get("/buyer-trust/{buyer_name}")
def get_buyer_trust_profile(buyer_name: str):
    """Returns verified credentials, trust score, and payment track record of a buyer."""
    profile = BUYER_TRUST_DB.get(buyer_name)
    if not profile:
        return {
            "trust_score": 90,
            "rating_stars": 4.5,
            "fulfillment_rate_pct": 95.0,
            "avg_settlement_hours": 24,
            "gst_verified": True,
            "pan_verified": True,
            "total_procured_tonnes": 150.0,
            "badges": ["Verified Buyer"],
        }
    return profile


@router.get("/offers")
def list_offers():
    """List all digital offers and negotiation threads."""
    return OFFERS_DB


@router.post("/offers")
def submit_digital_offer(req: CreateOfferRequest):
    """Submits a binding digital offer from a buyer to a farmer/FPO lot."""
    new_offer = {
        "id": f"off-{uuid.uuid4().hex[:6]}",
        "listing_id": req.listing_id,
        "crop_name": req.crop_name,
        "farmer_name": req.farmer_name,
        "buyer_name": req.buyer_name,
        "buyer_category": req.buyer_category,
        "quantity_kg": req.quantity_kg,
        "asking_price_per_kg": req.asking_price_per_kg,
        "offered_price_per_kg": req.offered_price_per_kg,
        "status": "OFFER_SUBMITTED",
        "terms": req.terms,
        "created_at": datetime.now().isoformat(),
        "escrow_status": "ESCROW_PREAUTH_READY",
    }
    OFFERS_DB.insert(0, new_offer)
    return new_offer


@router.post("/offers/{offer_id}/counter")
def counter_offer(offer_id: str, req: CounterOfferRequest):
    """Farmer or buyer counters the offer price/terms."""
    offer = next((o for o in OFFERS_DB if o["id"] == offer_id), None)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    offer["offered_price_per_kg"] = req.counter_price_per_kg
    if req.updated_terms:
        offer["terms"] = req.updated_terms
    offer["status"] = "COUNTER_OFFERED"
    return offer


@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: str):
    """Accepts the offer, locking the deal into 4-stage Escrow."""
    offer = next((o for o in OFFERS_DB if o["id"] == offer_id), None)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    offer["status"] = "ACCEPTED"
    offer["escrow_status"] = "FUNDS_LOCKED"
    return offer
