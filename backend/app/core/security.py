from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from cachetools import TTLCache
from fastapi import Request
from firebase_admin import auth

from app.config import get_settings
from app.core.exceptions import UnauthorizedError

settings = get_settings()

# Cache verified tokens for TTL seconds to avoid re-verifying on every request
_token_cache: TTLCache = TTLCache(
    maxsize=1000,
    ttl=settings.token_verify_cache_ttl_seconds,
)


@dataclass
class CurrentUser:
    uid: str
    email: str | None
    phone_number: str | None
    email_verified: bool
    custom_claims: dict[str, Any]


def _extract_bearer_token(request: Request) -> str:
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedError("Missing or malformed Authorization header")
    return token


def verify_firebase_token(token: str) -> CurrentUser:
    """
    Verifies a Firebase ID token and returns a CurrentUser.
    Results are cached by token string for TOKEN_VERIFY_CACHE_TTL_SECONDS.
    """
    if token in _token_cache:
        return _token_cache[token]

    try:
        decoded = auth.verify_id_token(token, check_revoked=True)
    except auth.RevokedIdTokenError:
        raise UnauthorizedError("Token has been revoked. Please sign in again.")
    except auth.ExpiredIdTokenError:
        raise UnauthorizedError("Token has expired. Please sign in again.")
    except auth.InvalidIdTokenError:
        raise UnauthorizedError("Invalid token.")
    except Exception:
        raise UnauthorizedError("Authentication failed.")

    user = CurrentUser(
        uid=decoded["uid"],
        email=decoded.get("email"),
        phone_number=decoded.get("phone_number"),
        email_verified=decoded.get("email_verified", False),
        custom_claims=decoded.get("custom_claims", {}),
    )
    _token_cache[token] = user
    return user


def get_current_user_from_request(request: Request) -> CurrentUser:
    token = _extract_bearer_token(request)
    return verify_firebase_token(token)


def invalidate_token_cache(token: str) -> None:
    """Remove a token from the cache (called on logout)."""
    _token_cache.pop(token, None)
