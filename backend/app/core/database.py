"""
SQLAlchemy engine + session management.

Three ways to point the backend at a database, in order of preference:
  1. CLOUD_SQL_INSTANCE set -> the Cloud SQL PostgreSQL instance behind Firebase SQL Connect
     (Data Connect), reached through Google's Cloud SQL connector with the service-account
     credentials in GOOGLE_APPLICATION_CREDENTIALS. No public IP or firewall rule needed.
  2. DATABASE_URL set to postgresql://... -> any PostgreSQL (e.g. the Data Connect emulator).
  3. Otherwise the local SQLite file, for zero-setup development.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


def _cloud_sql_engine():
    from google.cloud.sql.connector import Connector

    connector = Connector()

    def connect():
        return connector.connect(
            settings.CLOUD_SQL_INSTANCE,
            "pg8000",
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            db=settings.DB_NAME,
        )

    return create_engine("postgresql+pg8000://", creator=connect, pool_pre_ping=True, pool_size=5, max_overflow=5)


if settings.CLOUD_SQL_INSTANCE:
    engine = _cloud_sql_engine()
    db_url = f"cloudsql://{settings.CLOUD_SQL_INSTANCE}/{settings.DB_NAME}"
else:
    db_url = settings.DATABASE_URL
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)

IS_POSTGRES = engine.dialect.name == "postgresql"

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
