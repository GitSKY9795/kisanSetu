"""
Admin Management & Platform Metrics API Routes.
Provides platform statistics, listing moderation, dispute management, and transaction overview.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics")
def get_admin_platform_metrics():
    """Returns platform overview KPIs and summary statistics."""
    return {
        "total_farmers": 1420,
        "active_buyers": 85,
        "registered_fpos": 18,
        "active_listings": 340,
        "total_orders": 128,
        "completed_transactions_value_inr": 4850000.0,
        "total_produce_volume_tonnes": 2450.5,
        "active_disputes": 2,
    }


@router.get("/disputes")
def get_platform_disputes():
    """List pending disputes between buyers and sellers/FPOs."""
    return [
        {
            "id": "disp-101",
            "order_id": "ord-881",
            "farmer_name": "Ramesh Kumar",
            "buyer_name": "AgriCorp Processing Ltd",
            "reason": "Quality grade discrepancy (Grade A requested, Grade B delivered)",
            "status": "UNDER_REVIEW",
            "amount_inr": 24500.0,
        }
    ]
