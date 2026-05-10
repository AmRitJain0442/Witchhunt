import json
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, auth, storage
from google.cloud import firestore as _firestore
from google.oauth2 import service_account

from app.config import get_settings

_firebase_app: firebase_admin.App | None = None


def _service_account_info() -> dict | None:
    settings = get_settings()
    if not settings.firebase_service_account_json:
        return None
    return json.loads(settings.firebase_service_account_json)


def _admin_credentials():
    settings = get_settings()
    info = _service_account_info()
    if info is not None:
        return credentials.Certificate(info)
    return credentials.Certificate(settings.firebase_service_account_key_path)


def _google_credentials():
    settings = get_settings()
    info = _service_account_info()
    if info is not None:
        return service_account.Credentials.from_service_account_info(info)
    return service_account.Credentials.from_service_account_file(
        settings.firebase_service_account_key_path
    )


def init_firebase() -> None:
    global _firebase_app
    if _firebase_app is not None:
        return

    settings = get_settings()
    cred = _admin_credentials()
    _firebase_app = firebase_admin.initialize_app(
        cred,
        {"storageBucket": settings.firebase_storage_bucket},
    )


@lru_cache(maxsize=1)
def get_firestore_client() -> _firestore.AsyncClient:
    """Returns a cached async Firestore client."""
    settings = get_settings()
    return _firestore.AsyncClient(
        project=settings.firebase_project_id,
        credentials=_google_credentials(),
    )


def get_auth_client() -> auth:
    """Returns the Firebase Auth module (already initialized via init_firebase)."""
    return auth


def get_storage_bucket():
    """Returns the Firebase Storage bucket."""
    return storage.bucket()
