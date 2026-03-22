from datetime import date, datetime, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.enums import WearablePlatform
from app.core.exceptions import NotFoundError
from app.models.wearable import (
    DailyWearableData,
    WearableConnectResponse,
    WearableDataResponse,
    WearablePlatformStatus,
    WearableStatusResponse,
    WearableSyncRequest,
    WearableSyncResponse,
)


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------

_METRIC_AGGREGATION: dict[str, str] = {
    "steps": "sum",
    "heart_rate": "avg",
    "resting_heart_rate": "min",
    "sleep_duration": "sum",
    "calories": "sum",
    "calories_burned": "sum",
    "active_minutes": "sum",
    "spo2": "avg",
    "hrv": "avg",
}

# Mapping from WearableDataPoint.metric to DailyWearableData field name
_METRIC_TO_FIELD: dict[str, str] = {
    "steps": "steps",
    "heart_rate": "avg_heart_rate",
    "resting_heart_rate": "resting_heart_rate",
    "sleep_duration": "sleep_hours",
    "calories_burned": "calories_burned",
    "active_minutes": "active_minutes",
    "spo2": "spo2_avg",
    "hrv": "hrv_ms",
}


def _aggregate(values: list[float], strategy: str) -> float:
    if not values:
        return 0.0
    if strategy == "sum":
        return sum(values)
    if strategy == "min":
        return min(values)
    # default avg
    return sum(values) / len(values)


def _build_daily_snapshot(aggregated: dict[str, float], platform: WearablePlatform, sync_date: date) -> dict:
    """Build the Firestore document for wearable_data/{date_str}."""
    doc: dict = {
        "date": sync_date.isoformat(),
        "source": platform.value,
        "updated_at": datetime.now(timezone.utc),
    }
    for metric, value in aggregated.items():
        field = _METRIC_TO_FIELD.get(metric)
        if field:
            # Convert sleep from minutes to hours
            if metric == "sleep_duration":
                doc[field] = round(value / 60.0, 2)
            else:
                doc[field] = round(value, 2)
    return doc


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

async def get_connect_info(uid: str, platform: WearablePlatform, db: AsyncClient) -> WearableConnectResponse:
    if platform == WearablePlatform.APPLE_HEALTH:
        return WearableConnectResponse(
            platform=platform,
            auth_url=None,
            instructions="Use the app's HealthKit integration to sync data. Tap Sync in Settings.",
            is_sdk_based=True,
        )

    # Google Fit — generate a placeholder OAuth URL and persist nonce
    nonce = str(uuid4())
    now = datetime.now(timezone.utc)

    conn_ref = (
        db.collection("users")
        .document(uid)
        .collection("wearable_connections")
        .document(WearablePlatform.GOOGLE_FIT.value)
    )
    await conn_ref.set(
        {
            "platform": WearablePlatform.GOOGLE_FIT.value,
            "status": "pending_oauth",
            "oauth_nonce": nonce,
            "nonce_created_at": now,
            "connected": False,
        },
        merge=True,
    )

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id=PLACEHOLDER_CLIENT_ID"
        f"&redirect_uri=https://app.kutumb.health/wearable/callback/google_fit"
        f"&response_type=code"
        f"&scope=https://www.googleapis.com/auth/fitness.activity.read"
        f"+https://www.googleapis.com/auth/fitness.heart_rate.read"
        f"+https://www.googleapis.com/auth/fitness.sleep.read"
        f"&state={nonce}"
        f"&access_type=offline"
        f"&prompt=consent"
    )

    return WearableConnectResponse(
        platform=platform,
        auth_url=auth_url,
        instructions="Click the link above to authorise Google Fit access.",
        is_sdk_based=False,
    )


async def handle_google_fit_callback(
    uid: str,
    code: str,
    state: str,
    db: AsyncClient,
) -> str:
    """
    Handle the OAuth callback from Google Fit.
    Validates the nonce (state), marks the connection active, and returns a redirect URL.
    For a hackathon stub, the actual token exchange is omitted but the structure is correct.
    """
    conn_ref = (
        db.collection("users")
        .document(uid)
        .collection("wearable_connections")
        .document(WearablePlatform.GOOGLE_FIT.value)
    )
    conn_doc = await conn_ref.get()

    if not conn_doc.exists:
        return "kutumbapp://wearable/callback?error=no_pending_connection"

    conn_data = conn_doc.to_dict() or {}
    stored_nonce = conn_data.get("oauth_nonce", "")

    if stored_nonce != state:
        return "kutumbapp://wearable/callback?error=invalid_state"

    now = datetime.now(timezone.utc)
    # In production: exchange `code` for access_token + refresh_token via Google OAuth2 API.
    # For this stub, store the auth code and mark connected.
    await conn_ref.update(
        {
            "status": "connected",
            "connected": True,
            "auth_code": code,  # would be exchanged for tokens in production
            "connected_at": now,
            "last_synced_at": None,
            "sync_errors": [],
            "metrics_available": [
                "steps",
                "heart_rate",
                "sleep_duration",
                "calories_burned",
                "active_minutes",
            ],
        }
    )

    return "kutumbapp://wearable/callback?status=connected&platform=google_fit"


async def sync_wearable(uid: str, req: WearableSyncRequest, db: AsyncClient) -> WearableSyncResponse:
    now = datetime.now(timezone.utc)
    date_str = req.sync_date.isoformat()
    records_synced = 0
    records_failed = 0
    metrics_updated: list[str] = []

    if req.platform == WearablePlatform.APPLE_HEALTH:
        # Client-push path: aggregate data_points by metric for sync_date
        by_metric: dict[str, list[float]] = {}
        for dp in req.data_points:
            by_metric.setdefault(dp.metric, []).append(dp.value)

        aggregated: dict[str, float] = {}
        for metric, values in by_metric.items():
            strategy = _METRIC_AGGREGATION.get(metric, "avg")
            try:
                aggregated[metric] = _aggregate(values, strategy)
                metrics_updated.append(metric)
                records_synced += len(values)
            except Exception:  # noqa: BLE001
                records_failed += len(values)

        if aggregated:
            doc_data = _build_daily_snapshot(aggregated, req.platform, req.sync_date)
            await (
                db.collection("users")
                .document(uid)
                .collection("wearable_data")
                .document(date_str)
                .set(doc_data, merge=True)
            )

    else:
        # Google Fit server-pull stub — nothing to pull without real tokens,
        # return a reasonable placeholder response indicating 0 records synced.
        pass

    # Update last_synced_at on the connection document
    conn_ref = (
        db.collection("users")
        .document(uid)
        .collection("wearable_connections")
        .document(req.platform.value)
    )
    await conn_ref.set(
        {
            "platform": req.platform.value,
            "last_synced_at": now,
            "connected": True,
        },
        merge=True,
    )

    return WearableSyncResponse(
        platform=req.platform,
        sync_date=req.sync_date,
        records_synced=records_synced,
        records_failed=records_failed,
        last_sync_at=now,
        metrics_updated=metrics_updated,
        triggered_score_recompute=records_synced > 0,
    )


async def get_status(uid: str, db: AsyncClient) -> WearableStatusResponse:
    platform_statuses: list[WearablePlatformStatus] = []

    for platform in WearablePlatform:
        conn_doc = await (
            db.collection("users")
            .document(uid)
            .collection("wearable_connections")
            .document(platform.value)
            .get()
        )

        if conn_doc.exists:
            data = conn_doc.to_dict() or {}
            platform_statuses.append(
                WearablePlatformStatus(
                    platform=platform,
                    connected=bool(data.get("connected", False)),
                    last_synced_at=data.get("last_synced_at"),
                    sync_errors=data.get("sync_errors", []),
                    metrics_available=data.get("metrics_available", []),
                )
            )
        else:
            platform_statuses.append(
                WearablePlatformStatus(
                    platform=platform,
                    connected=False,
                    last_synced_at=None,
                    sync_errors=[],
                    metrics_available=[],
                )
            )

    return WearableStatusResponse(platforms=platform_statuses)


async def disconnect_platform(uid: str, platform: WearablePlatform, db: AsyncClient) -> None:
    conn_ref = (
        db.collection("users")
        .document(uid)
        .collection("wearable_connections")
        .document(platform.value)
    )
    doc = await conn_ref.get()
    if not doc.exists:
        raise NotFoundError(f"Wearable connection for {platform.value}")

    await conn_ref.update(
        {
            "connected": False,
            "status": "disconnected",
            "disconnected_at": datetime.now(timezone.utc),
            "auth_code": None,
        }
    )


async def get_wearable_data(
    uid: str,
    start_date: date,
    end_date: date,
    metrics: list[str] | None,
    db: AsyncClient,
) -> WearableDataResponse:
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    ref = db.collection("users").document(uid).collection("wearable_data")
    docs = [doc async for doc in ref.stream()]

    daily_list: list[DailyWearableData] = []

    for doc in docs:
        data = doc.to_dict()
        doc_date_str = data.get("date", doc.id)
        if isinstance(doc_date_str, date):
            doc_date_str = doc_date_str.isoformat()
        if doc_date_str < start_str or doc_date_str > end_str:
            continue

        try:
            doc_date = date.fromisoformat(doc_date_str)
        except ValueError:
            continue

        source_raw = data.get("source")
        source_platform: WearablePlatform | None = None
        if source_raw:
            try:
                source_platform = WearablePlatform(source_raw)
            except ValueError:
                pass

        entry = DailyWearableData(
            date=doc_date,
            steps=int(data["steps"]) if data.get("steps") is not None else None,
            resting_heart_rate=float(data["resting_heart_rate"]) if data.get("resting_heart_rate") is not None else None,
            avg_heart_rate=float(data["avg_heart_rate"]) if data.get("avg_heart_rate") is not None else None,
            spo2_avg=float(data["spo2_avg"]) if data.get("spo2_avg") is not None else None,
            sleep_hours=float(data["sleep_hours"]) if data.get("sleep_hours") is not None else None,
            calories_burned=int(data["calories_burned"]) if data.get("calories_burned") is not None else None,
            active_minutes=int(data["active_minutes"]) if data.get("active_minutes") is not None else None,
            hrv_ms=float(data["hrv_ms"]) if data.get("hrv_ms") is not None else None,
            source=source_platform,
        )
        daily_list.append(entry)

    daily_list.sort(key=lambda d: d.date)

    # Compute period averages for requested (or all) numeric fields
    field_names = [
        "steps", "resting_heart_rate", "avg_heart_rate",
        "spo2_avg", "sleep_hours", "calories_burned", "active_minutes", "hrv_ms",
    ]
    if metrics:
        # Map requested metrics to field names where possible
        metric_to_field = {
            "steps": "steps",
            "heart_rate": "avg_heart_rate",
            "resting_heart_rate": "resting_heart_rate",
            "spo2": "spo2_avg",
            "sleep_duration": "sleep_hours",
            "calories_burned": "calories_burned",
            "active_minutes": "active_minutes",
            "hrv": "hrv_ms",
        }
        field_names = list({metric_to_field.get(m, m) for m in metrics if metric_to_field.get(m, m) in field_names})

    period_averages: dict = {}
    for field in field_names:
        values = [getattr(d, field) for d in daily_list if getattr(d, field) is not None]
        if values:
            period_averages[field] = round(sum(values) / len(values), 2)

    return WearableDataResponse(data=daily_list, period_averages=period_averages)
