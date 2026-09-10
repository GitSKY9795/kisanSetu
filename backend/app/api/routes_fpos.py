"""
FPO (Farmer Producer Organisation) Management, Bulk Aggregation & Transparent Payout Ledger API.
Empowers smallholders through collective bargaining and eliminates intermediary margin leakage.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/fpos", tags=["fpos"])

FPO_POOLS_DB = [
    {
        "id": "pool-101",
        "fpo_name": "Pragati Kisan Producer Co-op",
        "crop_name": "Wheat",
        "variety": "Sharbati Gold",
        "district": "Ujjain",
        "state": "Madhya Pradesh",
        "total_quantity_kg": 5000.0,
        "target_quantity_kg": 10000.0,
        "target_price_per_kg": 27.00,
        "mandi_benchmark_price_per_kg": 24.50,
        "quality_grade": "Grade A (Aggregated Bulk)",
        "status": "OPEN",
        "contributions": [
            {"id": "c-1", "farmer_name": "Ramesh Kumar", "quantity_kg": 1200.0, "contact": "+91 98261 00001"},
            {"id": "c-2", "farmer_name": "Suresh Patel", "quantity_kg": 1500.0, "contact": "+91 98261 00002"},
            {"id": "c-3", "farmer_name": "Anita Devi", "quantity_kg": 1300.0, "contact": "+91 98261 00003"},
            {"id": "c-4", "farmer_name": "Vikram Singh", "quantity_kg": 1000.0, "contact": "+91 98261 00004"},
        ],
        "created_at": datetime.now().isoformat(),
    }
]


class PoolCreateRequest(BaseModel):
    fpo_name: str
    crop_name: str
    variety: str = "Standard"
    district: str = "Ujjain"
    target_price_per_kg: float = 27.0
    target_quantity_kg: float = 10000.0


class PoolMemberAddRequest(BaseModel):
    farmer_name: str
    quantity_kg: float
    contact: str | None = None


@router.get("")
def list_fpos():
    """Get registered FPOs and pooling statistics."""
    return [
        {
            "id": "fpo-1",
            "name": "Pragati Kisan Producer Co-op",
            "district": "Ujjain",
            "state": "Madhya Pradesh",
            "total_members": 240,
            "active_pools": len(FPO_POOLS_DB),
            "collective_turnover_lakhs": 48.5,
        },
        {
            "id": "fpo-2",
            "name": "Samriddhi Farmer Producer Company",
            "district": "Nashik",
            "state": "Maharashtra",
            "total_members": 180,
            "active_pools": 2,
            "collective_turnover_lakhs": 36.2,
        },
    ]


@router.get("/pools")
def list_fpo_pools():
    """List all aggregated produce pools created by FPOs."""
    return FPO_POOLS_DB


@router.post("/pools")
def create_fpo_pool(req: PoolCreateRequest):
    """Create a new produce aggregation pool."""
    new_pool = {
        "id": f"pool-{uuid.uuid4().hex[:6]}",
        "fpo_name": req.fpo_name,
        "crop_name": req.crop_name,
        "variety": req.variety,
        "district": req.district,
        "state": "Madhya Pradesh",
        "total_quantity_kg": 0.0,
        "target_quantity_kg": req.target_quantity_kg,
        "target_price_per_kg": req.target_price_per_kg,
        "mandi_benchmark_price_per_kg": round(req.target_price_per_kg * 0.90, 2),
        "quality_grade": "Grade A (Aggregated Bulk)",
        "status": "OPEN",
        "contributions": [],
        "created_at": datetime.now().isoformat(),
    }
    FPO_POOLS_DB.append(new_pool)
    return new_pool


@router.post("/pools/{pool_id}/add-member")
def add_farmer_to_pool(pool_id: str, req: PoolMemberAddRequest):
    """Add a farmer's produce lot to an existing FPO pool."""
    pool = next((p for p in FPO_POOLS_DB if p["id"] == pool_id), None)
    if not pool:
        raise HTTPException(status_code=404, detail="FPO pool not found")

    new_contribution = {
        "id": f"c-{uuid.uuid4().hex[:4]}",
        "farmer_name": req.farmer_name,
        "quantity_kg": req.quantity_kg,
        "contact": req.contact or "+91 98000 00000",
    }
    pool["contributions"].append(new_contribution)
    pool["total_quantity_kg"] = sum(c["quantity_kg"] for c in pool["contributions"])
    return {
        "message": f"Added {req.quantity_kg} kg from {req.farmer_name} to pool {pool_id}",
        "updated_total_quantity_kg": pool["total_quantity_kg"],
        "pool": pool,
    }


@router.get("/pools/{pool_id}/payout-ledger")
def get_fpo_payout_ledger(pool_id: str):
    """
    Calculates transparent distribution ledger for all farmer members in a pooled lot.
    Includes corporate premium gain and shared freight savings.
    """
    pool = next((p for p in FPO_POOLS_DB if p["id"] == pool_id), None)
    if not pool:
        raise HTTPException(status_code=404, detail="FPO pool not found")

    sold_price_per_kg = pool["target_price_per_kg"]
    mandi_price_per_kg = pool.get("mandi_benchmark_price_per_kg", sold_price_per_kg * 0.90)
    total_qty = pool["total_quantity_kg"]

    gross_pool_revenue = round(total_qty * sold_price_per_kg, 2)
    fpo_handling_fee_pct = 2.0  # Transparent 2% administrative/loading charge
    fpo_handling_fee_total = round(gross_pool_revenue * (fpo_handling_fee_pct / 100), 2)
    shared_logistics_cost = round(total_qty * 0.50, 2)  # Bulk freight rate ₹0.50/kg vs ₹1.20/kg individual
    net_distributable_revenue = round(gross_pool_revenue - fpo_handling_fee_total - shared_logistics_cost, 2)

    member_ledger = []
    for c in pool["contributions"]:
        qty = c["quantity_kg"]
        share_pct = round((qty / total_qty * 100), 2) if total_qty > 0 else 0
        gross_member_payout = round(qty * sold_price_per_kg, 2)
        member_handling_fee = round(gross_member_payout * (fpo_handling_fee_pct / 100), 2)
        member_transport = round(qty * 0.50, 2)
        net_member_payout = round(gross_member_payout - member_handling_fee - member_transport, 2)
        
        # Calculate extra gain vs selling individually at Mandi
        mandi_individual_net = round(qty * (mandi_price_per_kg - 1.20), 2)
        extra_income_realized = round(net_member_payout - mandi_individual_net, 2)

        member_ledger.append({
            "farmer_name": c["farmer_name"],
            "quantity_kg": qty,
            "share_pct": share_pct,
            "gross_amount_inr": gross_member_payout,
            "fpo_fee_inr": member_handling_fee,
            "shared_transport_inr": member_transport,
            "net_payout_inr": net_member_payout,
            "extra_income_vs_mandi_inr": extra_income_realized,
            "payout_status": "READY_FOR_DISBURSEMENT",
        })

    return {
        "pool_id": pool_id,
        "fpo_name": pool["fpo_name"],
        "crop_name": pool["crop_name"],
        "total_quantity_kg": total_qty,
        "agreed_selling_price_per_kg": sold_price_per_kg,
        "gross_revenue_inr": gross_pool_revenue,
        "fpo_operational_fee_inr": fpo_handling_fee_total,
        "shared_freight_cost_inr": shared_logistics_cost,
        "total_net_distributable_inr": net_distributable_revenue,
        "members_count": len(member_ledger),
        "ledger": member_ledger,
    }
