"""
UUID primary keys arrive over HTTP as plain strings (URL path params, JSON body fields).
SQLAlchemy's postgres-flavored UUID(as_uuid=True) column type expects an actual
uuid.UUID instance when binding a query parameter — under SQLite (this project's default
dev database) it does NOT silently coerce a raw string, so every lookup-by-id needs to go
through this first.
"""
import uuid

from fastapi import HTTPException


def parse_uuid(value: str, detail: str = "Not found") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail=detail)
