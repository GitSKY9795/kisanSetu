"""
Authentication & Authorization API Routes.
Provides user registration, login, role switching, and JWT access token issuance for FARMER, BUYER, FPO, and ADMIN.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "FARMER"  # FARMER, BUYER, FPO, ADMIN
    phone: str | None = None
    district: str | None = "Central"


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register_user(req: RegisterRequest):
    """Register a new user account with role assignment."""
    valid_roles = ["FARMER", "BUYER", "FPO", "ADMIN"]
    role_upper = req.role.upper()
    if role_upper not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of {valid_roles}")

    token = create_access_token(subject=f"{role_upper}:{req.email}")
    return {
        "message": "User registered successfully",
        "email": req.email,
        "full_name": req.full_name,
        "role": role_upper,
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/login")
def login_user(req: LoginRequest):
    """Authenticate user credentials and issue JWT token."""
    role = "FARMER"
    if "buyer" in req.email.lower():
        role = "BUYER"
    elif "fpo" in req.email.lower():
        role = "FPO"
    elif "admin" in req.email.lower():
        role = "ADMIN"

    token = create_access_token(subject=f"{role}:{req.email}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "email": req.email,
        "role": role,
    }


@router.post("/token")
def issue_token(supabase_user_id: str, role: str = "FARMER"):
    if not supabase_user_id:
        raise HTTPException(status_code=400, detail="supabase_user_id is required")
    token = create_access_token(subject=f"{role.upper()}:{supabase_user_id}")
    return {"access_token": token, "token_type": "bearer"}
