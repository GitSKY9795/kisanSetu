"""
SQLAlchemy engine + session management.
Supports SQLite fallback for zero-setup local dev & PostgreSQL/Supabase for production.
"""
from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
except Exception:
    # SQLite local fallback engine
    db_url = "sqlite:///./kisansetu.db"
    engine = create_engine(db_url, pool_pre_ping=True, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator:
    """FastAPI dependency — yields a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
