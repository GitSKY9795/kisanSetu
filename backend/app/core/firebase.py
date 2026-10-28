"""
Firebase Admin SDK bootstrap + ID token verification.
Single identity provider for every role (Farmer/Buyer/FPO/Admin) — mirrors what
backend-node/firebaseAdmin.js used to do, now inside the one backend.
"""
import logging
import os

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.core.config import settings

logger = logging.getLogger("kisansetu.firebase")

_app: firebase_admin.App | None = None


class TokenVerificationUnavailable(Exception):
    """Raised when a token could not be checked at all (network/credentials/cert-fetch
    failure) — distinct from the token genuinely being invalid or expired. Callers must
    not treat this the same as "not authenticated", or a transient outage looks
    identical to a bad token and strands already-registered users back at /register."""


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
    or None if the token is missing/invalid/expired.

    Raises TokenVerificationUnavailable if verification itself could not run (e.g. no
    network access to fetch Google's signing certs, bad service-account credentials) —
    that is not the same failure as "invalid token" and must surface as a 503, not a 401,
    so the frontend doesn't mistake a backend/network outage for "you're not registered".
    """
    if not id_token:
        return None
    try:
        app = _get_app()
    except Exception as exc:
        logger.error("Firebase Admin SDK failed to initialize: %r", exc)
        raise TokenVerificationUnavailable(str(exc)) from exc
    try:
        return firebase_auth.verify_id_token(id_token, app=app)
    except firebase_auth.InvalidIdTokenError as exc:
        logger.info("Rejected invalid Firebase ID token: %r", exc)
        return None
    except firebase_auth.ExpiredIdTokenError as exc:
        logger.info("Rejected expired Firebase ID token: %r", exc)
        return None
    except firebase_auth.RevokedIdTokenError as exc:
        logger.info("Rejected revoked Firebase ID token: %r", exc)
        return None
    except firebase_auth.CertificateFetchError as exc:
        # Couldn't reach Google to fetch the public keys needed to verify the signature —
        # a connectivity problem, not proof the token is bad.
        logger.error("Could not fetch Firebase certificates to verify token: %r", exc)
        raise TokenVerificationUnavailable(str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected error verifying Firebase ID token: %r", exc)
        raise TokenVerificationUnavailable(str(exc)) from exc
