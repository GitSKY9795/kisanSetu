"""
Copies every row from the local SQLite database into the Firebase SQL Connect (Data Connect)
PostgreSQL database the backend is configured for.

Run from the backend folder, after `firebase deploy --only dataconnect` has created the tables:

    python -m scripts.migrate_to_firebase_sql            # copy
    python -m scripts.migrate_to_firebase_sql --dry-run  # only show what would be copied

The target is whatever app/core/database.py connects to: CLOUD_SQL_INSTANCE (+ DB_USER,
DB_PASSWORD, DB_NAME) for the real Cloud SQL instance, or DATABASE_URL=postgresql+pg8000://...
for the local Data Connect emulator. Safe to run more than once — rows that already exist
(same id or same unique value) are skipped, never overwritten.
"""
import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine, func, select
from sqlalchemy.dialects.postgresql import insert

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app.models  # noqa: E402,F401 — registers every table on Base.metadata
from app.core.database import IS_POSTGRES, Base, db_url, engine  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", default=str(Path(__file__).resolve().parent.parent / "kisansetu.db"), help="SQLite file to copy from")
    parser.add_argument("--dry-run", action="store_true", help="count rows only, write nothing")
    args = parser.parse_args()

    if not IS_POSTGRES:
        print("The backend is not pointed at PostgreSQL. Set CLOUD_SQL_INSTANCE (or DATABASE_URL) in backend/.env first.")
        return 1
    if not Path(args.source).exists():
        print(f"Source database not found: {args.source}")
        return 1

    source = create_engine(f"sqlite:///{args.source}")
    print(f"From: {args.source}\nTo:   {db_url}\n")

    total_new = 0
    with source.connect() as src, engine.begin() as dst:
        missing = [t.name for t in Base.metadata.sorted_tables if not engine.dialect.has_table(dst, t.name)]
        if missing:
            print("These tables don't exist in the target yet:", ", ".join(missing))
            print("Run `firebase deploy --only dataconnect` from the project root first.")
            return 1

        for table in Base.metadata.sorted_tables:  # parents before children (users -> farmers -> listings ...)
            rows = [dict(r._mapping) for r in src.execute(select(table))]
            before = dst.execute(select(func.count()).select_from(table)).scalar_one()
            if rows and not args.dry_run:
                dst.execute(insert(table).values(rows).on_conflict_do_nothing())
            after = dst.execute(select(func.count()).select_from(table)).scalar_one()
            added = after - before
            total_new += added
            note = "(dry run)" if args.dry_run else f"+{added} new"
            print(f"  {table.name:<20} source {len(rows):>4}   target {after:>4}   {note}")

        if args.dry_run:
            dst.rollback()

    print(f"\nDone. {total_new} rows copied." if not args.dry_run else "\nDry run — nothing was written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
