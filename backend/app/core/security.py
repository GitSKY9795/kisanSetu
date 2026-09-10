"""
Password hashing + JWT issuing/verification helpers.
"""
import base64
import json
import time
from datetime import datetime, timedelta, timezone

from app.core.config import settings

try:
    from jose import JWTError, jwt
    USE_JOSE = True
except ImportError:
    USE_JOSE = False


def hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.JWT_EXPIRE_MINUTES
    )
    if USE_JOSE:
        payload = {"sub": subject, "exp": expire}
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    # Lightweight base64 token fallback
    payload = {"sub": subject, "exp": int(expire.timestamp())}
    token_bytes = json.dumps(payload).encode()
    return base64.urlsafe_b64encode(token_bytes).decode()


def decode_access_token(token: str) -> str | None:
    if USE_JOSE:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            return payload.get("sub")
        except Exception:
            return None
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        payload = json.loads(decoded)
        return payload.get("sub")
    except Exception:
        return None
