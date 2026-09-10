"""
Buyer Purchase Requirements API Routes.
Supports buyer categories: Retailer, Wholesaler, Processor, Institutional Buyer, Bulk Buyer
(the category itself lives on the Buyer profile, set at registration).
Negotiation offers against a specific listing/pool live in routes_marketplace.py.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.buyer import Buyer
from app.models.marketplace import BuyerRequirement
from app.models.user import User, UserRole

router = APIRouter(prefix="/buyers", tags=["buyers"])


class RequirementCreate(BaseModel):
    crop_name: str
    quantity_kg: float
    quality_grade: str = "Grade A"
    target_price_per_kg: float
    district: str = "Central"


def _requirement_dict(req: BuyerRequirement) -> dict:
    return {
        "id": str(req.id),
        "buyer_id": str(req.buyer_id),
        "buyer_name": req.buyer.name,
        "buyer_category": req.buyer.buyer_category,
        "crop_name": req.crop_name,
        "quantity_kg": req.quantity_kg,
        "quality_grade": req.quality_grade,
        "target_price_per_kg": req.target_price_per_kg,
        "district": req.district,
        "status": req.status,
        "created_at": req.created_at.isoformat(),
    }


@router.get("/requirements")
def list_buyer_requirements(
    crop: str | None = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active purchase requirements posted by buyers — visible to farmers/FPOs too."""
    query = db.query(BuyerRequirement).filter(BuyerRequirement.status == "ACTIVE")
    if crop:
        query = query.filter(BuyerRequirement.crop_name.ilike(crop))
    rows = query.order_by(BuyerRequirement.created_at.desc()).all()
    return [_requirement_dict(r) for r in rows]


@router.post("/requirements")
def create_buyer_requirement(
    req: RequirementCreate,
    user: User = Depends(require_role(UserRole.BUYER)),
    db: Session = Depends(get_db),
):
    """Post a new crop purchase requirement under the logged-in buyer's account."""
    buyer = db.query(Buyer).filter(Buyer.user_id == user.id).first()
    requirement = BuyerRequirement(
        buyer_id=buyer.id,
        crop_name=req.crop_name,
        quantity_kg=req.quantity_kg,
        quality_grade=req.quality_grade,
        target_price_per_kg=req.target_price_per_kg,
        district=req.district,
        status="ACTIVE",
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    return _requirement_dict(requirement)
