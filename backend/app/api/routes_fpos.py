"""
FPO (Farmer Producer Organisation) Management, Bulk Aggregation & Transparent Payout Ledger API.
Empowers smallholders through collective bargaining and eliminates intermediary margin leakage.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.ids import parse_uuid
from app.models.farmer import Farmer
from app.models.fpo import FPO, FPOPool, FPOPoolMember
from app.models.user import User, UserRole

router = APIRouter(prefix="/fpos", tags=["fpos"])


class PoolCreateRequest(BaseModel):
    crop_name: str
    variety: str = "Standard"
    district: str | None = None
    target_price_per_kg: float = 27.0
    target_quantity_kg: float = 10000.0


class PoolMemberAddRequest(BaseModel):
    farmer_phone: str
    quantity_kg: float


def _pool_dict(pool: FPOPool, db: Session) -> dict:
    members = (
        db.query(FPOPoolMember, Farmer)
        .join(Farmer, FPOPoolMember.farmer_id == Farmer.id)
        .filter(FPOPoolMember.pool_id == pool.id)
        .all()
    )
    return {
        "id": str(pool.id),
        "fpo_id": str(pool.fpo_id),
        "fpo_name": pool.fpo.name,
        "crop_name": pool.crop_name,
        "variety": pool.variety,
        "district": pool.district,
        "state": pool.state,
        "total_quantity_kg": pool.total_quantity_kg,
        "target_quantity_kg": pool.target_quantity_kg,
        "target_price_per_kg": pool.target_price_per_kg,
        "mandi_benchmark_price_per_kg": pool.mandi_benchmark_price_per_kg,
        "quality_grade": "Grade A (Aggregated Bulk)",
        "status": pool.status,
        "contributions": [
            {
                "id": str(member.id),
                "farmer_name": farmer.name,
                "quantity_kg": member.quantity_kg,
                "contact": farmer.phone,
            }
            for member, farmer in members
        ],
        "created_at": pool.created_at.isoformat(),
    }


@router.get("")
def list_fpos(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Get registered FPOs and pooling statistics."""
    rows = db.query(FPO).all()
    result = []
    for fpo in rows:
        pool_count = db.query(func.count(FPOPool.id)).filter(FPOPool.fpo_id == fpo.id).scalar()
        member_count = db.query(func.count(Farmer.id)).filter(Farmer.fpo_id == fpo.id).scalar()
        result.append(
            {
                "id": str(fpo.id),
                "name": fpo.name,
                "district": fpo.district,
                "state": fpo.state,
                "total_members": member_count or 0,
                "active_pools": pool_count or 0,
            }
        )
    return result


@router.get("/pools")
def list_fpo_pools(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """List all aggregated produce pools created by FPOs."""
    rows = db.query(FPOPool).order_by(FPOPool.created_at.desc()).all()
    return [_pool_dict(p, db) for p in rows]


@router.post("/pools")
def create_fpo_pool(
    req: PoolCreateRequest,
    user: User = Depends(require_role(UserRole.FPO)),
    db: Session = Depends(get_db),
):
    """Create a new produce aggregation pool under the logged-in FPO."""
    fpo = db.query(FPO).filter(FPO.owner_user_id == user.id).first()
    pool = FPOPool(
        fpo_id=fpo.id,
        crop_name=req.crop_name,
        variety=req.variety,
        district=req.district or fpo.district,
        state=fpo.state,
        total_quantity_kg=0.0,
        target_quantity_kg=req.target_quantity_kg,
        target_price_per_kg=req.target_price_per_kg,
        mandi_benchmark_price_per_kg=round(req.target_price_per_kg * 0.90, 2),
        status="OPEN",
    )
    db.add(pool)
    db.commit()
    db.refresh(pool)
    return _pool_dict(pool, db)


@router.post("/pools/{pool_id}/add-member")
def add_farmer_to_pool(
    pool_id: str,
    req: PoolMemberAddRequest,
    user: User = Depends(require_role(UserRole.FPO)),
    db: Session = Depends(get_db),
):
    """Add a registered farmer's produce lot to one of the logged-in FPO's pools."""
    fpo = db.query(FPO).filter(FPO.owner_user_id == user.id).first()
    pool = db.query(FPOPool).filter(FPOPool.id == parse_uuid(pool_id), FPOPool.fpo_id == fpo.id).first()
    if not pool:
        raise HTTPException(status_code=404, detail="FPO pool not found")

    farmer = db.query(Farmer).filter(Farmer.phone == req.farmer_phone).first()
    if not farmer:
        raise HTTPException(
            status_code=404,
            detail="No registered farmer found with that mobile number. Ask them to register first.",
        )

    member = FPOPoolMember(pool_id=pool.id, farmer_id=farmer.id, quantity_kg=req.quantity_kg)
    db.add(member)
    farmer.fpo_id = fpo.id
    pool.total_quantity_kg = (pool.total_quantity_kg or 0) + req.quantity_kg
    db.add(pool)
    db.add(farmer)
    db.commit()

    return {
        "message": f"Added {req.quantity_kg} kg from {farmer.name} to pool {pool_id}",
        "updated_total_quantity_kg": pool.total_quantity_kg,
        "pool": _pool_dict(pool, db),
    }


@router.get("/pools/{pool_id}/payout-ledger")
def get_fpo_payout_ledger(
    pool_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Calculates transparent distribution ledger for all farmer members in a pooled lot.
    Includes corporate premium gain and shared freight savings.
    """
    pool = db.query(FPOPool).filter(FPOPool.id == parse_uuid(pool_id)).first()
    if not pool:
        raise HTTPException(status_code=404, detail="FPO pool not found")

    members = (
        db.query(FPOPoolMember, Farmer)
        .join(Farmer, FPOPoolMember.farmer_id == Farmer.id)
        .filter(FPOPoolMember.pool_id == pool.id)
        .all()
    )

    sold_price_per_kg = pool.target_price_per_kg or 0.0
    mandi_price_per_kg = pool.mandi_benchmark_price_per_kg or (sold_price_per_kg * 0.90)
    total_qty = pool.total_quantity_kg or 0.0

    gross_pool_revenue = round(total_qty * sold_price_per_kg, 2)
    fpo_handling_fee_pct = 2.0  # Transparent 2% administrative/loading charge
    fpo_handling_fee_total = round(gross_pool_revenue * (fpo_handling_fee_pct / 100), 2)
    shared_logistics_cost = round(total_qty * 0.50, 2)  # Bulk freight rate ₹0.50/kg vs ₹1.20/kg individual
    net_distributable_revenue = round(gross_pool_revenue - fpo_handling_fee_total - shared_logistics_cost, 2)

    member_ledger = []
    for member, farmer in members:
        qty = member.quantity_kg
        share_pct = round((qty / total_qty * 100), 2) if total_qty > 0 else 0
        gross_member_payout = round(qty * sold_price_per_kg, 2)
        member_handling_fee = round(gross_member_payout * (fpo_handling_fee_pct / 100), 2)
        member_transport = round(qty * 0.50, 2)
        net_member_payout = round(gross_member_payout - member_handling_fee - member_transport, 2)

        mandi_individual_net = round(qty * (mandi_price_per_kg - 1.20), 2)
        extra_income_realized = round(net_member_payout - mandi_individual_net, 2)

        member_ledger.append(
            {
                "farmer_name": farmer.name,
                "quantity_kg": qty,
                "share_pct": share_pct,
                "gross_amount_inr": gross_member_payout,
                "fpo_fee_inr": member_handling_fee,
                "shared_transport_inr": member_transport,
                "net_payout_inr": net_member_payout,
                "extra_income_vs_mandi_inr": extra_income_realized,
                "payout_status": "READY_FOR_DISBURSEMENT",
            }
        )

    return {
        "pool_id": pool_id,
        "fpo_name": pool.fpo.name,
        "crop_name": pool.crop_name,
        "total_quantity_kg": total_qty,
        "agreed_selling_price_per_kg": sold_price_per_kg,
        "gross_revenue_inr": gross_pool_revenue,
        "fpo_operational_fee_inr": fpo_handling_fee_total,
        "shared_freight_cost_inr": shared_logistics_cost,
        "total_net_distributable_inr": net_distributable_revenue,
        "members_count": len(member_ledger),
        "ledger": member_ledger,
    }
