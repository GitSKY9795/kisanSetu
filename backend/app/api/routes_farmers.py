"""
Farmer Profile & Crop Listing API Routes — scoped to the logged-in farmer.
The public browse feed (all farmers' + FPOs' listings) lives in routes_marketplace.py.
"""
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.crop import CropListing
from app.models.farmer import Farmer
from app.models.user import User, UserRole

router = APIRouter(prefix="/farmers", tags=["farmers"])


class CropListingCreate(BaseModel):
    crop_name: str
    variety: str = "Standard"
    quantity_kg: float
    price_per_kg: float
    quality_grade: str = "Grade A"
    harvest_date: str | None = None
    storage_available_kg: float = 0.0
    district: str | None = None
    state: str | None = None


def _current_farmer(user: User, db: Session) -> Farmer:
    farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found.")
    return farmer


def _listing_dict(listing: CropListing) -> dict:
    return {
        "id": str(listing.id),
        "farmer_id": str(listing.farmer_id),
        "farmer_name": listing.farmer.name,
        "crop_name": listing.crop_name,
        "variety": listing.variety,
        "quantity_kg": listing.quantity_kg,
        "price_per_kg": listing.price_per_kg,
        "quality_grade": listing.quality_grade,
        "district": listing.district,
        "state": listing.state,
        "storage_available_kg": listing.storage_available_kg,
        "harvest_date": listing.harvest_date,
        "status": listing.status,
        "created_at": listing.created_at.isoformat(),
    }


@router.get("/listings")
def list_my_crop_listings(
    user: User = Depends(require_role(UserRole.FARMER)),
    db: Session = Depends(get_db),
):
    """The logged-in farmer's own crop listings ('My Listings')."""
    farmer = _current_farmer(user, db)
    rows = (
        db.query(CropListing)
        .filter(CropListing.farmer_id == farmer.id)
        .order_by(CropListing.created_at.desc())
        .all()
    )
    return [_listing_dict(r) for r in rows]


@router.post("/listings")
def create_farmer_crop_listing(
    req: CropListingCreate,
    user: User = Depends(require_role(UserRole.FARMER)),
    db: Session = Depends(get_db),
):
    """Create a new produce listing — appears immediately in every buyer's Marketplace feed."""
    farmer = _current_farmer(user, db)
    listing = CropListing(
        farmer_id=farmer.id,
        crop_name=req.crop_name,
        variety=req.variety,
        quantity_kg=req.quantity_kg,
        price_per_kg=req.price_per_kg,
        quality_grade=req.quality_grade,
        harvest_date=req.harvest_date,
        storage_available_kg=req.storage_available_kg,
        district=req.district or farmer.district,
        state=req.state or farmer.state,
        status="LISTED",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _listing_dict(listing)
