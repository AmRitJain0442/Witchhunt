from datetime import timedelta

from app.core.firebase import get_storage_bucket


def get_signed_url(blob_path: str, expiration_days: int = 7) -> str:
    """Generate a signed URL for a Firebase Storage blob."""
    bucket = get_storage_bucket()
    blob = bucket.blob(blob_path)
    try:
        url = blob.generate_signed_url(
            expiration=timedelta(days=expiration_days),
            method="GET",
            version="v4",
        )
        return url
    except Exception:
        # Fallback: make public and return public URL
        blob.make_public()
        return blob.public_url


def upload_bytes(blob_path: str, data: bytes, content_type: str, make_public: bool = True) -> str:
    """Upload bytes to Firebase Storage and return the URL."""
    bucket = get_storage_bucket()
    blob = bucket.blob(blob_path)
    blob.upload_from_string(data, content_type=content_type)
    if make_public:
        blob.make_public()
        return blob.public_url
    return blob_path


def delete_blob(blob_path: str) -> None:
    """Delete a blob from Firebase Storage. Silently ignores not-found errors."""
    try:
        bucket = get_storage_bucket()
        blob = bucket.blob(blob_path)
        blob.delete()
    except Exception:
        pass
