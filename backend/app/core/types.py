"""Column types shared by the models."""
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator):
    """Timestamps stored as `timestamptz` (the type Firebase SQL Connect / Data Connect uses)
    while the application keeps working with naive UTC datetimes, as it always has.

    Values written are treated as UTC; values read back are converted to UTC and made naive,
    so comparisons like `datetime.utcnow() > row.sla_deadline` keep working on Postgres and
    on the local SQLite database alike."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if isinstance(value, datetime) and value.tzinfo is not None:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
