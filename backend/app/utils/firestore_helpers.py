"""Shared Firestore utility helpers."""
from datetime import date, datetime
from typing import Any

from google.cloud.firestore import AsyncClient, AsyncCollectionReference


async def doc_exists(ref) -> bool:
    doc = await ref.get()
    return doc.exists


async def get_or_404(ref, resource_name: str = "Resource") -> dict:
    from app.core.exceptions import NotFoundError
    doc = await ref.get()
    if not doc.exists:
        raise NotFoundError(resource_name)
    data = doc.to_dict()
    data["_id"] = doc.id
    return data


async def stream_collection(ref: AsyncCollectionReference) -> list[dict]:
    """Stream all docs from a collection reference into a list."""
    docs = []
    async for doc in ref.stream():
        data = doc.to_dict()
        data["_id"] = doc.id
        docs.append(data)
    return docs


def serialize_for_firestore(data: dict) -> dict:
    """Recursively convert date/datetime objects to ISO strings for Firestore."""
    result = {}
    for k, v in data.items():
        if isinstance(v, datetime):
            result[k] = v
        elif isinstance(v, date):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = serialize_for_firestore(v)
        elif isinstance(v, list):
            result[k] = [
                serialize_for_firestore(i) if isinstance(i, dict) else
                i.isoformat() if isinstance(i, (date, datetime)) else i
                for i in v
            ]
        else:
            result[k] = v
    return result


def paginate(items: list[Any], limit: int, offset: int) -> tuple[list[Any], bool]:
    """Simple in-memory pagination. Returns (page_items, has_more)."""
    total = len(items)
    page = items[offset: offset + limit]
    has_more = (offset + limit) < total
    return page, has_more
