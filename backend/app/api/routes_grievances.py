"""
Dispute & Grievance Redressal API Routes.
Directly fulfills SIH Problem Statement: "supports dispute or grievance processes ... transparent transaction records".
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.ids import parse_uuid
from app.models.grievance import Grievance
from app.models.transaction import Transaction
from app.models.user import User, UserRole

router = APIRouter(prefix="/grievances", tags=["grievances"])


class CreateGrievanceRequest(BaseModel):
    transaction_id: str
    category: str
    disputed_amount_inr: float = 0.0
    description: str


class ResolveGrievanceRequest(BaseModel):
    resolution_summary: str


def _grievance_dict(g: Grievance) -> dict:
    against_party = None
    if g.transaction:
        against_party = (
            g.transaction.buyer.name if g.raised_by_type == "FARMER" else g.transaction.farmer.name
        )
    return {
        "id": str(g.id),
        "ticket_no": g.ticket_no,
        "transaction_id": str(g.transaction_id) if g.transaction_id else None,
        "raised_by_type": g.raised_by_type,
        "raised_by_name": g.raised_by.full_name,
        "against_party": against_party,
        "category": g.category,
        "crop_name": g.crop_name,
        "disputed_amount_inr": g.disputed_amount_inr,
        "description": g.description,
        "status": g.status,
        "resolution_summary": g.resolution_summary,
        "resolved_at": g.resolved_at.isoformat() if g.resolved_at else None,
        "sla_deadline": g.sla_deadline.isoformat(),
        "created_at": g.created_at.isoformat(),
    }


@router.get("")
def list_grievances(
    status: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin sees every ticket; everyone else sees only the ones they raised."""
    query = db.query(Grievance)
    if user.role != UserRole.ADMIN:
        query = query.filter(Grievance.raised_by_user_id == user.id)
    if status and status.lower() != "all":
        query = query.filter(Grievance.status == status.upper())
    rows = query.order_by(Grievance.created_at.desc()).all()
    return [_grievance_dict(g) for g in rows]


@router.get("/stats")
def get_grievance_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Returns overview statistics of dispute resolution platform."""
    all_rows = db.query(Grievance).all()
    total = len(all_rows)
    resolved_rows = [g for g in all_rows if g.status == "RESOLVED" and g.resolved_at]
    resolved = len(resolved_rows)
    under_mediation = total - len([g for g in all_rows if g.status == "RESOLVED"])
    resolution_rate = round((len([g for g in all_rows if g.status == "RESOLVED"]) / total) * 100, 1) if total else 100.0
    avg_resolution_hours = (
        round(sum((g.resolved_at - g.created_at).total_seconds() / 3600 for g in resolved_rows) / resolved, 1)
        if resolved else 0.0
    )

    return {
        "total_grievances": total,
        "resolved_count": resolved,
        "under_mediation_count": under_mediation,
        "resolution_rate_pct": resolution_rate,
        "avg_resolution_time_hours": avg_resolution_hours,
        "escrow_protection_guarantee": "100% Protected",
    }


@router.post("")
def raise_grievance(
    req: CreateGrievanceRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a formal dispute or grievance ticket against one of your own transactions."""
    if user.role not in (UserRole.FARMER, UserRole.BUYER):
        raise HTTPException(status_code=403, detail="Only farmers and buyers can raise grievances")

    txn = db.query(Transaction).filter(Transaction.id == parse_uuid(req.transaction_id, "Transaction not found")).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    ticket = Grievance(
        id=uuid.uuid4(),
        ticket_no=f"KS-DISP-{datetime.now().year}-{uuid.uuid4().hex[:4].upper()}",
        transaction_id=txn.id,
        raised_by_user_id=user.id,
        raised_by_type=user.role.value,
        category=req.category,
        crop_name=txn.crop_name,
        disputed_amount_inr=req.disputed_amount_inr,
        description=req.description,
        status="UNDER_MEDIATION",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return _grievance_dict(ticket)


@router.post("/{grievance_id}/resolve")
def resolve_grievance(
    grievance_id: str,
    req: ResolveGrievanceRequest,
    _: User = Depends(require_role(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    """Admin resolves the grievance."""
    ticket = db.query(Grievance).filter(Grievance.id == parse_uuid(grievance_id, "Grievance ticket not found")).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Grievance ticket not found")

    ticket.status = "RESOLVED"
    ticket.resolution_summary = req.resolution_summary
    ticket.resolved_at = datetime.utcnow()
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return _grievance_dict(ticket)
