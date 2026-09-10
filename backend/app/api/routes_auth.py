"""
Identity API — Firebase is the sole identity provider for every role. A user verifies
their email (Firebase Email Link), sets a username + password, then finishes
registration here to become a FARMER, BUYER or FPO. ADMIN accounts are seeded, not
self-service.
"""
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.buyer import Buyer
from app.models.farmer import Farmer
from app.models.fpo import FPO
from app.models.user import User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


def _farmer_dict(f: Farmer) -> dict:
    return {
        "id": str(f.id),
        "name": f.name,
        "phone": f.phone,
        "village": f.village,
        "district": f.district,
        "state": f.state,
        "pin_code": f.pin_code,
        "farmer_type": f.farmer_type,
        "land_area": f.land_area,
        "main_crops": f.main_crops,
        "fpo_id": str(f.fpo_id) if f.fpo_id else None,
    }


def _buyer_dict(b: Buyer) -> dict:
    return {
        "id": str(b.id),
        "name": b.name,
        "organization": b.organization,
        "buyer_category": b.buyer_category,
        "phone": b.phone,
        "district": b.district,
        "state": b.state,
        "is_verified": b.is_verified,
        "payment_reliability_score": b.payment_reliability_score,
    }


def _fpo_dict(fpo: FPO) -> dict:
    return {
        "id": str(fpo.id),
        "name": fpo.name,
        "registration_id": fpo.registration_id,
        "district": fpo.district,
        "state": fpo.state,
        "contact_phone": fpo.contact_phone,
    }


def get_profile(user: User, db: Session):
    if user.role == UserRole.FARMER:
        row = db.query(Farmer).filter(Farmer.user_id == user.id).first()
        return _farmer_dict(row) if row else None
    if user.role == UserRole.BUYER:
        row = db.query(Buyer).filter(Buyer.user_id == user.id).first()
        return _buyer_dict(row) if row else None
    if user.role == UserRole.FPO:
        row = db.query(FPO).filter(FPO.owner_user_id == user.id).first()
        return _fpo_dict(row) if row else None
    return None


def _me_payload(user: User, db: Session) -> dict:
    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "phone": user.phone,
            "full_name": user.full_name,
        },
        "role": user.role.value if user.role else None,
        "profile": get_profile(user, db),
    }


@router.get("/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Called right after Firebase sign-in to resolve identity: username + role + linked
    profile. username is null until POST /auth/username; role is null until the frontend
    sends the user through /auth/register/{role}."""
    return _me_payload(user, db)


USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.]{3,24}$")


class SetUsernameRequest(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def valid_username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3-24 characters: letters, numbers, underscore or dot.")
        return v


@router.post("/username")
def set_username(
    req: SetUsernameRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sets the account's username — called right after the user links a password to
    their (already email-verified) Firebase account, before role selection."""
    if user.username:
        raise HTTPException(status_code=400, detail="Username is already set for this account.")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=409, detail="That username is already taken.")

    user.username = req.username
    db.add(user)
    db.commit()
    db.refresh(user)
    return _me_payload(user, db)


class FarmerRegisterRequest(BaseModel):
    name: str
    phone: str
    state: str
    district: str
    village: str
    pin_code: str | None = None
    farmer_type: str | None = None
    land_area: float | None = None
    main_crops: str | None = None


class BuyerRegisterRequest(BaseModel):
    name: str
    phone: str
    organization: str | None = None
    buyer_category: str = "Wholesaler"
    district: str
    state: str


class FPORegisterRequest(BaseModel):
    name: str
    phone: str
    registration_id: str | None = None
    district: str
    state: str


def _ensure_unregistered(user: User):
    if user.role is not None:
        raise HTTPException(status_code=400, detail="This account is already registered.")


@router.post("/register/farmer")
def register_farmer(
    req: FarmerRegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_unregistered(user)
    if db.query(Farmer).filter(Farmer.phone == req.phone).first():
        raise HTTPException(status_code=409, detail="A farmer with this mobile number already exists.")

    farmer = Farmer(
        id=uuid.uuid4(),
        user_id=user.id,
        name=req.name,
        phone=req.phone,
        village=req.village,
        district=req.district,
        state=req.state,
        pin_code=req.pin_code,
        farmer_type=req.farmer_type,
        land_area=req.land_area,
        main_crops=req.main_crops,
    )
    user.role = UserRole.FARMER
    user.full_name = req.name
    user.phone = req.phone
    db.add(farmer)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _me_payload(user, db)


@router.post("/register/buyer")
def register_buyer(
    req: BuyerRegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_unregistered(user)
    if db.query(Buyer).filter(Buyer.phone == req.phone).first():
        raise HTTPException(status_code=409, detail="A buyer with this mobile number already exists.")

    buyer = Buyer(
        id=uuid.uuid4(),
        user_id=user.id,
        name=req.name,
        organization=req.organization,
        buyer_category=req.buyer_category,
        phone=req.phone,
        district=req.district,
        state=req.state,
        is_verified=False,
    )
    user.role = UserRole.BUYER
    user.full_name = req.name
    user.phone = req.phone
    db.add(buyer)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _me_payload(user, db)


@router.post("/register/fpo")
def register_fpo(
    req: FPORegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_unregistered(user)

    fpo = FPO(
        id=uuid.uuid4(),
        owner_user_id=user.id,
        name=req.name,
        registration_id=req.registration_id,
        district=req.district,
        state=req.state,
        contact_phone=req.phone,
    )
    user.role = UserRole.FPO
    user.full_name = req.name
    user.phone = req.phone
    db.add(fpo)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _me_payload(user, db)
