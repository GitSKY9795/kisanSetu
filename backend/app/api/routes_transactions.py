"""
Orders, 4-Stage Milestone Escrow, & Digital Invoice API Routes.
Directly fulfills Problem Statement: "payment tracking ... transparent transaction records".
Transactions are created by accepting a marketplace offer (see routes_marketplace.py) —
that's the moment a buyer's offer and a farmer's listing become one shared record both
dashboards read from.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.ids import parse_uuid
from app.models.buyer import Buyer
from app.models.farmer import Farmer
from app.models.transaction import ESCROW_STAGES, Transaction
from app.models.user import User, UserRole

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _txn_dict(txn: Transaction) -> dict:
    return {
        "id": str(txn.id),
        "invoice_no": txn.invoice_no,
        "farmer_name": txn.farmer.name,
        "buyer_name": txn.buyer.name,
        "crop_name": txn.crop_name,
        "quality_grade": txn.quality_grade,
        "quantity_kg": txn.quantity_kg,
        "agreed_price_per_kg": txn.agreed_price_per_kg,
        "transport_cost_per_kg": txn.transport_cost,
        "storage_cost_per_kg": txn.storage_cost,
        "net_realization_per_kg": txn.net_realization_per_kg,
        "total_amount_inr": round(txn.agreed_price_per_kg * txn.quantity_kg, 2),
        "escrow_stage": txn.escrow_stage,
        "escrow_stage_label": txn.escrow_stage_label,
        "payment_status": txn.payment_status,
        "delivery_status": txn.delivery_status,
        "stages_timeline": txn.stages_timeline(),
        "created_at": txn.created_at.isoformat(),
    }


def _authorize(txn: Transaction, user: User, db: Session):
    if user.role == UserRole.ADMIN:
        return
    if user.role == UserRole.FARMER:
        farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
        if farmer and txn.farmer_id == farmer.id:
            return
    if user.role == UserRole.BUYER:
        buyer = db.query(Buyer).filter(Buyer.user_id == user.id).first()
        if buyer and txn.buyer_id == buyer.id:
            return
    raise HTTPException(status_code=403, detail="Not authorized for this transaction")


@router.get("")
def list_transactions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Transaction/escrow history relevant to the logged-in user."""
    query = db.query(Transaction)
    if user.role == UserRole.FARMER:
        farmer = db.query(Farmer).filter(Farmer.user_id == user.id).first()
        query = query.filter(Transaction.farmer_id == farmer.id) if farmer else query.filter(False)
    elif user.role == UserRole.BUYER:
        buyer = db.query(Buyer).filter(Buyer.user_id == user.id).first()
        query = query.filter(Transaction.buyer_id == buyer.id) if buyer else query.filter(False)
    rows = query.order_by(Transaction.created_at.desc()).all()
    return [_txn_dict(t) for t in rows]


@router.post("/{txn_id}/advance-escrow")
def advance_escrow_stage(txn_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Advances a transaction through the 4-stage Escrow (buyer confirms dispatch/quality/payout)."""
    txn = db.query(Transaction).filter(Transaction.id == parse_uuid(txn_id, "Transaction not found")).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    _authorize(txn, user, db)

    if txn.escrow_stage < 4:
        next_stage = txn.escrow_stage + 1
        label, pay_status, delivery_status = ESCROW_STAGES[next_stage]
        txn.escrow_stage = next_stage
        txn.escrow_stage_label = label
        txn.payment_status = pay_status
        txn.delivery_status = delivery_status
        setattr(txn, f"stage_{next_stage}_at", datetime.utcnow())
        if next_stage == 4:
            txn.status = "COMPLETED"
        db.add(txn)
        db.commit()
        db.refresh(txn)

    return _txn_dict(txn)


@router.get("/{txn_id}/invoice")
def get_digital_invoice(txn_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns downloadable e-tax invoice / receipt for farmer & buyer."""
    txn = db.query(Transaction).filter(Transaction.id == parse_uuid(txn_id, "Transaction not found")).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    _authorize(txn, user, db)

    gross_amount = round(txn.agreed_price_per_kg * txn.quantity_kg, 2)
    return {
        "invoice_header": {
            "title": "KISANSETU AGRICULTURAL TRADE INVOICE & ESCROW RECEIPT",
            "invoice_no": txn.invoice_no,
            "date": txn.created_at.date().isoformat(),
            "portal": "KisanSetu B2B Direct Agricultural Settlement Platform",
        },
        "parties": {
            "seller_farmer": txn.farmer.name,
            "buyer_organization": txn.buyer.organization or txn.buyer.name,
        },
        "item_details": {
            "crop": txn.crop_name,
            "quality_grade": txn.quality_grade,
            "quantity_kg": txn.quantity_kg,
            "unit_price_inr": txn.agreed_price_per_kg,
            "gross_amount_inr": gross_amount,
            "freight_deduction_inr": round(txn.transport_cost * txn.quantity_kg, 2),
            "net_farmer_realization_inr": round((txn.net_realization_per_kg or txn.agreed_price_per_kg) * txn.quantity_kg, 2),
        },
        "settlement": {
            "escrow_status": txn.escrow_stage_label,
            "payout_mode": "Automated Escrow Bank Settlement / Instant UPI",
            "guarantee": "100% KisanSetu Escrow Protected",
        },
    }
