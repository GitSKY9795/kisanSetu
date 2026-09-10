"""
Seeds the local DB with demo farmers, buyers, an FPO pool and a crop listing so the
Marketplace/FPO/Admin dashboards have something real to browse before anyone signs up.

These seeded profiles use placeholder firebase_uid values, so you can't actually log in
as them through the real Firebase email-link + password flow — they're browsing data
only. To exercise the real register → dashboard flow, sign in through the app UI (see
README "Getting Started"). To make a real logged-in account an ADMIN, use
`scripts/promote_admin.py` instead.

Usage:
    cd backend && python -m scripts.seed_data
"""
from app.core.database import Base, SessionLocal, engine
from app.models.buyer import Buyer
from app.models.crop import CropListing
from app.models.farmer import Farmer
from app.models.fpo import FPO, FPOPool, FPOPoolMember
from app.models.user import User, UserRole


def _seed_user(db, *, firebase_uid, phone, full_name, role) -> User:
    user = User(firebase_uid=firebase_uid, phone=phone, full_name=full_name, role=role)
    db.add(user)
    db.flush()
    return user


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Farmer).first():
            print("Data already seeded — skipping.")
            return

        fpo_owner = _seed_user(
            db, firebase_uid="seed-fpo-owner", phone="7777700001",
            full_name="Nashik Onion Growers FPO", role=UserRole.FPO,
        )
        fpo = FPO(owner_user_id=fpo_owner.id, name="Nashik Onion Growers FPO", district="Nashik", state="Maharashtra")
        db.add(fpo)
        db.flush()

        farmer_user = _seed_user(
            db, firebase_uid="seed-farmer-1", phone="9999900001",
            full_name="Ramesh Patil", role=UserRole.FARMER,
        )
        farmer = Farmer(
            user_id=farmer_user.id,
            name="Ramesh Patil",
            phone="9999900001",
            preferred_language="mr",
            village="Lasalgaon",
            district="Nashik",
            state="Maharashtra",
            farmer_type="Land Owner",
            land_area=3.5,
            main_crops="Onion, Wheat",
            storage_capacity_kg=200,
            fpo_id=fpo.id,
        )
        db.add(farmer)
        db.flush()

        buyer1_user = _seed_user(
            db, firebase_uid="seed-buyer-1", phone="8888800001",
            full_name="AgroFresh Traders", role=UserRole.BUYER,
        )
        buyer1 = Buyer(
            user_id=buyer1_user.id,
            name="AgroFresh Traders",
            organization="AgroFresh Pvt Ltd",
            buyer_category="Wholesaler",
            phone="8888800001",
            district="Nashik",
            state="Maharashtra",
            is_verified=True,
            payment_reliability_score=4.6,
        )
        buyer2_user = _seed_user(
            db, firebase_uid="seed-buyer-2", phone="8888800002",
            full_name="Mumbai Wholesale Mandi Co.", role=UserRole.BUYER,
        )
        buyer2 = Buyer(
            user_id=buyer2_user.id,
            name="Mumbai Wholesale Mandi Co.",
            organization="MWM Co.",
            buyer_category="Processor",
            phone="8888800002",
            district="Mumbai",
            state="Maharashtra",
            is_verified=True,
            payment_reliability_score=4.2,
        )
        db.add_all([buyer1, buyer2])
        db.flush()

        listing = CropListing(
            farmer_id=farmer.id,
            crop_name="Onion",
            variety="Nashik Red",
            quantity_kg=500,
            price_per_kg=22.0,
            quality_grade="Grade A",
            district="Nashik",
            state="Maharashtra",
            status="LISTED",
        )
        db.add(listing)

        pool = FPOPool(
            fpo_id=fpo.id,
            crop_name="Onion",
            variety="Nashik Red",
            district="Nashik",
            state="Maharashtra",
            total_quantity_kg=800,
            target_quantity_kg=5000,
            target_price_per_kg=23.5,
            mandi_benchmark_price_per_kg=21.0,
            status="OPEN",
        )
        db.add(pool)
        db.flush()
        db.add(FPOPoolMember(pool_id=pool.id, farmer_id=farmer.id, quantity_kg=800))

        db.commit()
        print("Seeded: 1 FPO + pool, 1 farmer, 2 buyers, 1 crop listing.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
