"""
Makes an existing, already-signed-in user an ADMIN. Admin accounts are seeded, not
self-service: sign in once through the app UI (verify email, set a username/password)
so a User row exists, then run this to flip that account's role — no role-details form
needs to be filled in first, since Admin has none.

Usage:
    cd backend && python -m scripts.promote_admin --email you@example.com
"""
import argparse

from app.core.database import SessionLocal
from app.models.user import User, UserRole


def run(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"No user found with email {email}. Sign in through the app first (Register → Verify Email).")
            return
        if user.role is not None:
            print(f"User {email} already has role {user.role.value} — leaving unchanged.")
            return
        user.role = UserRole.ADMIN
        user.full_name = user.full_name or user.username or "Platform Admin"
        db.add(user)
        db.commit()
        print(f"User {email} is now ADMIN.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True, help="Email the user signed up with")
    args = parser.parse_args()
    run(args.email)
