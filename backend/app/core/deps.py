"""
FastAPI auth dependencies shared by every route module.
"""
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.firebase import verify_firebase_token
from app.models.user import User, UserRole


def get_firebase_claims(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    claims = verify_firebase_token(token)
    if not claims:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return claims


def get_current_user(
    db: Session = Depends(get_db),
    claims: dict = Depends(get_firebase_claims),
) -> User:
    """Looks up (or lazily creates) the local User row for this Firebase identity.
    A freshly-created user has role=None until they finish POST /auth/register/{role}."""
    uid = claims["uid"]
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user:
        user = User(firebase_uid=uid, phone=claims.get("phone_number"))
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def require_role(*roles: UserRole):
    """Route dependency: 403s unless the authenticated user has finished registration
    with one of the given roles. Use for writes; leave reads open to any authenticated role."""

    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role is None or user.role not in roles:
            allowed = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires role: {allowed}",
            )
        return user

    return dependency
