"""
Makes an existing, already-signed-in user an ADMIN. Admin accounts are seeded, not
self-service: sign in once through the app UI (Firebase phone OTP) so a User row exists,
then run this to flip that account's role.

Usage:
    cd backend && python -m scripts.promote_admin --phone 9999999999
"""
import argparse

from app.core.database import SessionLocal
from app.models.user import User, UserRole


def run(phone: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone == phone).first()
        if not user:
            print(f"No user found with phone {phone}. Sign in through the app first.")
            return
        if user.role is not None:
            print(f"User {phone} already has role {user.role.value} — leaving unchanged.")
            return
        user.role = UserRole.ADMIN
        user.full_name = user.full_name or "Platform Admin"
        db.add(user)
        db.commit()
        print(f"User {phone} is now ADMIN.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--phone", required=True, help="Phone number (as stored on the User row, e.g. +919999999999)")
    args = parser.parse_args()
    run(args.phone)
