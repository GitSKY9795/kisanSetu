"""
Admin Management & Platform Metrics API Routes.
Every number here is a real aggregate over the same tables every other role reads/writes —
this is the concrete proof that role data is interconnected, not simulated.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.buyer import Buyer
from app.models.crop import CropListing
from app.models.farmer import Farmer
from app.models.fpo import FPO
from app.models.grievance import Grievance
from app.models.transaction import Transaction
from app.models.user import UserRole

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics")
def get_admin_platform_metrics(db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    """Returns platform overview KPIs computed live from the shared database."""
    total_farmers = db.query(func.count(Farmer.id)).scalar() or 0
    active_buyers = db.query(func.count(Buyer.id)).scalar() or 0
    registered_fpos = db.query(func.count(FPO.id)).scalar() or 0
    active_listings = db.query(func.count(CropListing.id)).filter(CropListing.status == "LISTED").scalar() or 0
    total_orders = db.query(func.count(Transaction.id)).scalar() or 0

    completed = db.query(Transaction).filter(Transaction.status == "COMPLETED").all()
    completed_value = round(sum(t.agreed_price_per_kg * t.quantity_kg for t in completed), 2)

    total_volume_kg = db.query(func.coalesce(func.sum(CropListing.quantity_kg), 0.0)).scalar() or 0.0
    active_disputes = db.query(func.count(Grievance.id)).filter(Grievance.status != "RESOLVED").scalar() or 0

    return {
        "total_farmers": total_farmers,
        "active_buyers": active_buyers,
        "registered_fpos": registered_fpos,
        "active_listings": active_listings,
        "total_orders": total_orders,
        "completed_transactions_value_inr": completed_value,
        "total_produce_volume_tonnes": round(total_volume_kg / 1000, 2),
        "active_disputes": active_disputes,
    }


@router.get("/disputes")
def get_platform_disputes(db: Session = Depends(get_db), _=Depends(require_role(UserRole.ADMIN))):
    """List pending disputes between buyers and sellers/FPOs."""
    rows = db.query(Grievance).filter(Grievance.status != "RESOLVED").order_by(Grievance.created_at.desc()).all()
    result = []
    for g in rows:
        against_party = None
        if g.transaction:
            against_party = g.transaction.buyer.name if g.raised_by_type == "FARMER" else g.transaction.farmer.name
        result.append(
            {
                "id": str(g.id),
                "order_id": str(g.transaction_id) if g.transaction_id else None,
                "farmer_name": g.transaction.farmer.name if g.transaction else None,
                "buyer_name": g.transaction.buyer.name if g.transaction else against_party,
                "reason": g.description,
                "status": g.status,
                "amount_inr": g.disputed_amount_inr,
            }
        )
    return result
