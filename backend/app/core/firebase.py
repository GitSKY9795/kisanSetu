"""
Firebase Admin SDK bootstrap + ID token verification.
Single identity provider for every role (Farmer/Buyer/FPO/Admin) — mirrors what
backend-node/firebaseAdmin.js used to do, now inside the one backend.
"""
import os

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.core.config import settings

_app: firebase_admin.App | None = None


def _get_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app
    if firebase_admin._apps:
        _app = firebase_admin.get_app()
        return _app

    cred_path = settings.GOOGLE_APPLICATION_CREDENTIALS or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    options = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
    if cred_path and os.path.exists(cred_path):
        _app = firebase_admin.initialize_app(credentials.Certificate(cred_path), options)
    else:
        # Falls back to Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS env
        # var, gcloud ADC, or a GCP metadata server) — raises clearly at verify-time if unset.
        _app = firebase_admin.initialize_app(options=options)
    return _app


def verify_firebase_token(id_token: str) -> dict | None:
    """Verifies a Firebase ID token and returns its decoded claims (uid, phone_number, ...),
    or None if the token is missing/invalid/expired."""
    if not id_token:
        return None
    try:
        app = _get_app()
        return firebase_auth.verify_id_token(id_token, app=app)
    except Exception:
        return None
