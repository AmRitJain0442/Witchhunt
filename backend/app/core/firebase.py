import firebase_admin
from firebase_admin import credentials, auth, storage
from google.cloud import firestore as _firestore
from google.oauth2 import service_account
from functools import lru_cache
from app.config import get_settings

_firebase_app: firebase_admin.App | None = None


def init_firebase() -> None:
    global _firebase_app
    if _firebase_app is not None:
        return

    settings = get_settings()
    cred = credentials.Certificate(settings.firebase_service_account_key_path)
    _firebase_app = firebase_admin.initialize_app(
        cred,
        {"storageBucket": settings.firebase_storage_bucket},
    )


@lru_cache(maxsize=1)
def get_firestore_client() -> _firestore.AsyncClient:
    """Returns a cached async Firestore client."""
    settings = get_settings()
    sa_credentials = service_account.Credentials.from_service_account_file(
        settings.firebase_service_account_key_path
    )
    return _firestore.AsyncClient(
        project=settings.firebase_project_id,
        credentials=sa_credentials,
    )


def get_auth_client() -> auth:
    """Returns the Firebase Auth module (already initialized via init_firebase)."""
    return auth


def get_storage_bucket():
    """Returns the Firebase Storage bucket."""
    return storage.bucket()
