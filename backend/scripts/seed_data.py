"""
Seeds the local DB with a handful of demo farmers, buyers and a crop listing
so the frontend has something real to show without waiting on live signups.

Usage:
    cd backend && python -m scripts.seed_data
"""
from app.core.database import Base, SessionLocal, engine
from app.models.buyer import Buyer
from app.models.crop import CropListing
from app.models.farmer import Farmer
from app.models.fpo import FPO


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Farmer).first():
            print("Data already seeded — skipping.")
            return

        fpo = FPO(name="Nashik Onion Growers FPO", district="Nashik", state="Maharashtra")
        db.add(fpo)
        db.flush()

        farmer = Farmer(
            name="Ramesh Patil",
            phone="9999900001",
            preferred_language="mr",
            village="Lasalgaon",
            district="Nashik",
            state="Maharashtra",
            storage_capacity_kg=200,
            fpo_id=fpo.id,
        )
        db.add(farmer)

        buyer1 = Buyer(
            name="AgroFresh Traders",
            organization="AgroFresh Pvt Ltd",
            phone="8888800001",
            district="Nashik",
            state="Maharashtra",
            is_verified=True,
            payment_reliability_score=4.6,
        )
        buyer2 = Buyer(
            name="Mumbai Wholesale Mandi Co.",
            organization="MWM Co.",
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
            crop_name="onion",
            quantity_kg=500,
            quality_grade="A",
            status="LISTED",
        )
        db.add(listing)

        db.commit()
        print(f"Seeded: 1 FPO, 1 farmer, 2 buyers, 1 crop listing.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
