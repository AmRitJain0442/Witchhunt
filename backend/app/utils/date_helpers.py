from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    return datetime.now(IST)


def today_ist() -> date:
    return datetime.now(IST).date()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_ist(dt: datetime) -> datetime:
    return dt.astimezone(IST)


def days_between(d1: date, d2: date) -> int:
    return abs((d2 - d1).days)


def date_range(start: date, end: date) -> list[date]:
    from datetime import timedelta
    result = []
    current = start
    while current <= end:
        result.append(current)
        current += timedelta(days=1)
    return result
