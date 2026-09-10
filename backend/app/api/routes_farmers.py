"""
Farmer Profile, Crop Listings, and Harvest Status API Routes.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/farmers", tags=["farmers"])

# In-memory crop listings store for immediate execution
FARMER_LISTINGS_DB = [
    {
        "id": "list-101",
        "farmer_name": "Ramesh Kumar",
        "crop_name": "Wheat",
        "variety": "Sharbati",
        "quantity_kg": 500.0,
        "district": "Ujjain",
        "state": "Madhya Pradesh",
        "expected_price_per_kg": 25.0,
        "harvest_date": "2026-03-15",
        "storage_available_kg": 600.0,
        "quality_grade": "Grade A",
        "status": "AVAILABLE",
        "created_at": datetime.utcnow().isoformat(),
    }
]


class CropListingCreate(BaseModel):
    farmer_name: str = "Ramesh Kumar"
    crop_name: str
    variety: str = "Standard"
    quantity_kg: float
    district: str = "Ujjain"
    state: str = "Madhya Pradesh"
    expected_price_per_kg: float
    harvest_date: str = "2026-03-15"
    storage_available_kg: float = 0.0
    quality_grade: str = "Grade A"


@router.get("/listings")
def list_farmer_crops():
    """List all farmer crop listings."""
    return FARMER_LISTINGS_DB


@router.post("/listings")
def create_farmer_crop_listing(req: CropListingCreate):
    """Create a new farmer produce listing."""
    new_listing = {
        "id": f"list-{uuid.uuid4().hex[:6]}",
        "farmer_name": req.farmer_name,
        "crop_name": req.crop_name,
        "variety": req.variety,
        "quantity_kg": req.quantity_kg,
        "district": req.district,
        "state": req.state,
        "expected_price_per_kg": req.expected_price_per_kg,
        "harvest_date": req.harvest_date,
        "storage_available_kg": req.storage_available_kg,
        "quality_grade": req.quality_grade,
        "status": "AVAILABLE",
        "created_at": datetime.utcnow().isoformat(),
    }
    FARMER_LISTINGS_DB.append(new_listing)
    return new_listing


@router.get("/profile/{farmer_id}")
def get_farmer_profile(farmer_id: str):
    """Get farmer profile details."""
    return {
        "farmer_id": farmer_id,
        "name": "Ramesh Kumar",
        "phone": "+919876543210",
        "preferred_language": "hi",
        "village": "Barna",
        "district": "Ujjain",
        "state": "Madhya Pradesh",
        "storage_capacity_kg": 600.0,
        "fpo_name": "Pragati Kisan Producer Co-op",
    }
