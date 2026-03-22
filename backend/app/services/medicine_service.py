from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from google.cloud.firestore import AsyncClient, transactional

from app.core.enums import (
    EMERGENCY_CATEGORIES,
    MedicineCategory,
    MedicineFrequency,
    PrescriptionStatus,
)
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.medicines import (
    AdherenceSummaryResponse,
    DoseLogListResponse,
    DoseLogRequest,
    DoseLogResponse,
    DoseScheduleItem,
    DoseTime,
    MedicineCreateRequest,
    MedicineListResponse,
    MedicineResponse,
    MedicineUpdateRequest,
    RefillRequest,
    TodayScheduleResponse,
)

IST = ZoneInfo("Asia/Kolkata")

_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _doses_per_day(frequency: MedicineFrequency, every_x_hours: int | None) -> float:
    if frequency == MedicineFrequency.ONCE_DAILY:
        return 1.0
    if frequency == MedicineFrequency.TWICE_DAILY:
        return 2.0
    if frequency == MedicineFrequency.THRICE_DAILY:
        return 3.0
    if frequency == MedicineFrequency.EVERY_X_HOURS:
        if every_x_hours and every_x_hours > 0:
            return 24.0 / every_x_hours
        return 1.0
    if frequency == MedicineFrequency.AS_NEEDED:
        return 0.0
    if frequency == MedicineFrequency.WEEKLY:
        return 1.0 / 7.0
    return 1.0


def _days_supply(current_stock: int, doses_per_day: float) -> float:
    if doses_per_day <= 0:
        return 999.0
    return current_stock / doses_per_day


def _next_dose_time(dose_times: list[DoseTime]) -> datetime | None:
    if not dose_times:
        return None
    now_ist = datetime.now(IST)
    today = now_ist.date()
    sorted_times = sorted(dose_times, key=lambda dt: dt.time)
    for dt in sorted_times:
        hour, minute = map(int, dt.time.split(":"))
        candidate = datetime(today.year, today.month, today.day, hour, minute, tzinfo=IST)
        if candidate > now_ist:
            return candidate.astimezone(timezone.utc)
    # All doses passed today — use first dose of tomorrow
    tomorrow = today + timedelta(days=1)
    first = sorted_times[0]
    hour, minute = map(int, first.time.split(":"))
    candidate = datetime(tomorrow.year, tomorrow.month, tomorrow.day, hour, minute, tzinfo=IST)
    return candidate.astimezone(timezone.utc)


async def _adherence_pct(
    uid: str,
    medicine_id: str,
    start_date: date,
    end_date: date,
    doses_per_day: float,
    db: AsyncClient,
) -> float:
    if doses_per_day <= 0:
        return 100.0
    logs_ref = db.collection("users").document(uid).collection("medicine_logs")
    query = (
        logs_ref
        .where("medicine_id", "==", medicine_id)
        .where("action", "==", "taken")
        .where("log_date", ">=", start_date.isoformat())
        .where("log_date", "<=", end_date.isoformat())
    )
    taken_docs = [d async for d in query.stream()]
    taken_count = len(taken_docs)
    days = max((end_date - start_date).days + 1, 1)
    expected = doses_per_day * days
    if expected <= 0:
        return 100.0
    return round(min(taken_count / expected * 100.0, 100.0), 1)


def _doc_to_dose_times(raw: list[dict]) -> list[DoseTime]:
    return [DoseTime(time=d["time"], dose_amount=d["dose_amount"], dose_unit=d["dose_unit"]) for d in raw]


def _build_medicine_response(data: dict, adherence_7d: float = 0.0, adherence_30d: float = 0.0) -> MedicineResponse:
    start_date = data["start_date"]
    if isinstance(start_date, str):
        start_date = date.fromisoformat(start_date)

    end_date = data.get("end_date")
    if isinstance(end_date, str) and end_date:
        end_date = date.fromisoformat(end_date)
    elif not end_date:
        end_date = None

    dose_times = _doc_to_dose_times(data.get("dose_times", []))
    frequency = MedicineFrequency(data["frequency"])
    dpd = _doses_per_day(frequency, data.get("every_x_hours"))
    current_stock = data.get("current_stock", 0)
    dsr = _days_supply(current_stock, dpd)
    reorder_threshold = data.get("reorder_threshold", 7)
    refill_alert = dsr < reorder_threshold
    category = MedicineCategory(data["category"])
    is_emergency = category in EMERGENCY_CATEGORIES
    next_dose = _next_dose_time(dose_times) if data.get("is_active", True) else None

    return MedicineResponse(
        medicine_id=data["medicine_id"],
        uid=data["uid"],
        name=data["name"],
        generic_name=data.get("generic_name"),
        category=category,
        is_emergency=is_emergency,
        prescription_id=data.get("prescription_id"),
        prescription_valid=data.get("prescription_valid"),
        frequency=frequency,
        dose_times=dose_times,
        start_date=start_date,
        end_date=end_date,
        is_active=data.get("is_active", True),
        current_stock=current_stock,
        doses_per_day=dpd,
        days_supply_remaining=dsr,
        reorder_threshold=reorder_threshold,
        refill_alert=refill_alert,
        adherence_pct_7d=adherence_7d,
        adherence_pct_30d=adherence_30d,
        next_dose_time=next_dose,
        prescribed_by=data.get("prescribed_by"),
        color=data.get("color"),
        photo_url=data.get("photo_url"),
        notes=data.get("notes"),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


async def create_medicine(
    uid: str,
    req: MedicineCreateRequest,
    db: AsyncClient,
) -> MedicineResponse:
    is_emergency = req.category in EMERGENCY_CATEGORIES

    # Validate prescription if required
    prescription_valid: bool | None = None
    if not is_emergency and req.prescription_id:
        presc_doc = await (
            db.collection("users")
            .document(uid)
            .collection("prescriptions")
            .document(req.prescription_id)
            .get()
        )
        if not presc_doc.exists:
            raise NotFoundError("Prescription")
        presc_data = presc_doc.to_dict()
        prescribed_date_raw = presc_data.get("prescribed_date")
        if isinstance(prescribed_date_raw, str):
            prescribed_date_val = date.fromisoformat(prescribed_date_raw)
        else:
            prescribed_date_val = prescribed_date_raw
        from datetime import timedelta as _td
        is_valid_presc = prescribed_date_val >= date.today() - _td(days=365)
        status_val = presc_data.get("status", "")
        if not is_valid_presc:
            raise ValidationError("The linked prescription has expired (older than 365 days)")
        if status_val != PrescriptionStatus.PARSED.value:
            raise ValidationError(
                f"Prescription is not yet parsed (current status: {status_val}). "
                "Wait for OCR processing to complete."
            )
        prescription_valid = True

    medicine_id = str(uuid4())
    now = datetime.now(timezone.utc)
    dpd = _doses_per_day(req.frequency, req.every_x_hours)
    dsr = _days_supply(req.current_stock, dpd)

    data: dict = {
        "medicine_id": medicine_id,
        "uid": uid,
        "name": req.name,
        "generic_name": req.generic_name,
        "category": req.category.value,
        "prescription_id": req.prescription_id,
        "prescription_valid": prescription_valid,
        "frequency": req.frequency.value,
        "dose_times": [dt.model_dump() for dt in req.dose_times],
        "every_x_hours": req.every_x_hours,
        "start_date": req.start_date.isoformat(),
        "end_date": req.end_date.isoformat() if req.end_date else None,
        "is_active": True,
        "current_stock": req.current_stock,
        "doses_per_day": dpd,
        "days_supply_remaining": dsr,
        "reorder_threshold": req.reorder_threshold,
        "refill_alert": dsr < req.reorder_threshold,
        "prescribed_by": req.prescribed_by,
        "color": req.color,
        "photo_url": req.photo_url,
        "notes": req.notes,
        "created_at": now,
        "updated_at": now,
    }

    await (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .document(medicine_id)
        .set(data)
    )

    return _build_medicine_response(data)


async def list_medicines(
    uid: str,
    is_active: bool | None,
    category: MedicineCategory | None,
    is_emergency: bool | None,
    db: AsyncClient,
) -> MedicineListResponse:
    medicines_ref = db.collection("users").document(uid).collection("medicines")
    query = medicines_ref.order_by("created_at", direction="DESCENDING")

    if is_active is not None:
        query = query.where("is_active", "==", is_active)

    if category is not None:
        query = query.where("category", "==", category.value)

    all_docs = [doc async for doc in query.stream()]

    today = date.today()
    start_7d = today - timedelta(days=7)
    start_30d = today - timedelta(days=30)

    medicines: list[MedicineResponse] = []
    refill_alerts_count = 0
    emergency_medicines_count = 0
    prescription_required_count = 0
    expired_prescriptions: list[str] = []
    total_active = 0

    for doc in all_docs:
        data = doc.to_dict()
        med_id = data["medicine_id"]
        cat = MedicineCategory(data["category"])
        emerg = cat in EMERGENCY_CATEGORIES

        if is_emergency is not None and emerg != is_emergency:
            continue

        dpd = _doses_per_day(MedicineFrequency(data["frequency"]), data.get("every_x_hours"))
        adh_7d = await _adherence_pct(uid, med_id, start_7d, today, dpd, db)
        adh_30d = await _adherence_pct(uid, med_id, start_30d, today, dpd, db)
        resp = _build_medicine_response(data, adh_7d, adh_30d)
        medicines.append(resp)

        if resp.is_active:
            total_active += 1
        if resp.refill_alert and resp.is_active:
            refill_alerts_count += 1
        if emerg and resp.is_active:
            emergency_medicines_count += 1
        if not emerg and resp.is_active:
            prescription_required_count += 1
        if resp.prescription_id and resp.prescription_valid is False and resp.is_active:
            expired_prescriptions.append(resp.medicine_id)

    return MedicineListResponse(
        medicines=medicines,
        total_active=total_active,
        refill_alerts_count=refill_alerts_count,
        emergency_medicines_count=emergency_medicines_count,
        prescription_required_count=prescription_required_count,
        expired_prescriptions=expired_prescriptions,
    )


async def get_medicine(
    uid: str,
    medicine_id: str,
    db: AsyncClient,
) -> MedicineResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .document(medicine_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Medicine")

    data = doc.to_dict()
    today = date.today()
    dpd = _doses_per_day(MedicineFrequency(data["frequency"]), data.get("every_x_hours"))
    adh_7d = await _adherence_pct(uid, medicine_id, today - timedelta(days=7), today, dpd, db)
    adh_30d = await _adherence_pct(uid, medicine_id, today - timedelta(days=30), today, dpd, db)
    return _build_medicine_response(data, adh_7d, adh_30d)


async def update_medicine(
    uid: str,
    medicine_id: str,
    req: MedicineUpdateRequest,
    db: AsyncClient,
) -> MedicineResponse:
    medicine_ref = (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .document(medicine_id)
    )
    doc = await medicine_ref.get()
    if not doc.exists:
        raise NotFoundError("Medicine")

    existing = doc.to_dict()
    now = datetime.now(timezone.utc)
    updates: dict = {"updated_at": now}

    if req.name is not None:
        updates["name"] = req.name
    if req.dose_times is not None:
        updates["dose_times"] = [dt.model_dump() for dt in req.dose_times]
    if req.end_date is not None:
        updates["end_date"] = req.end_date.isoformat()
    if req.current_stock is not None:
        updates["current_stock"] = req.current_stock
        freq = MedicineFrequency(existing["frequency"])
        every_x = req.every_x_hours if req.every_x_hours is not None else existing.get("every_x_hours")
        dpd = _doses_per_day(freq, every_x)
        reorder = req.reorder_threshold if req.reorder_threshold is not None else existing.get("reorder_threshold", 7)
        dsr = _days_supply(req.current_stock, dpd)
        updates["days_supply_remaining"] = dsr
        updates["refill_alert"] = dsr < reorder
    if req.reorder_threshold is not None:
        updates["reorder_threshold"] = req.reorder_threshold
        current_stock = updates.get("current_stock", existing.get("current_stock", 0))
        freq = MedicineFrequency(existing["frequency"])
        every_x = req.every_x_hours if req.every_x_hours is not None else existing.get("every_x_hours")
        dpd = _doses_per_day(freq, every_x)
        dsr = updates.get("days_supply_remaining", _days_supply(current_stock, dpd))
        updates["refill_alert"] = dsr < req.reorder_threshold
    if req.is_active is not None:
        updates["is_active"] = req.is_active
    if req.notes is not None:
        updates["notes"] = req.notes
    if req.every_x_hours is not None:
        updates["every_x_hours"] = req.every_x_hours
    if req.prescription_id is not None:
        updates["prescription_id"] = req.prescription_id

    await medicine_ref.update(updates)
    updated_doc = await medicine_ref.get()
    data = updated_doc.to_dict()

    today = date.today()
    dpd = _doses_per_day(MedicineFrequency(data["frequency"]), data.get("every_x_hours"))
    adh_7d = await _adherence_pct(uid, medicine_id, today - timedelta(days=7), today, dpd, db)
    adh_30d = await _adherence_pct(uid, medicine_id, today - timedelta(days=30), today, dpd, db)
    return _build_medicine_response(data, adh_7d, adh_30d)


async def delete_medicine(
    uid: str,
    medicine_id: str,
    db: AsyncClient,
) -> None:
    medicine_ref = (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .document(medicine_id)
    )
    doc = await medicine_ref.get()
    if not doc.exists:
        raise NotFoundError("Medicine")

    await medicine_ref.update(
        {"is_active": False, "updated_at": datetime.now(timezone.utc)}
    )


async def get_today_schedule(
    uid: str,
    db: AsyncClient,
) -> TodayScheduleResponse:
    now_ist = datetime.now(IST)
    today = now_ist.date()
    today_str = today.isoformat()
    overdue_cutoff = now_ist - timedelta(minutes=30)

    # Fetch all active medicines
    medicines_ref = db.collection("users").document(uid).collection("medicines")
    active_query = medicines_ref.where("is_active", "==", True)
    active_docs = [d async for d in active_query.stream()]

    # Fetch today's logs
    logs_ref = db.collection("users").document(uid).collection("medicine_logs")
    today_logs_query = logs_ref.where("log_date", "==", today_str)
    today_log_docs = [d async for d in today_logs_query.stream()]

    # Build lookup: (medicine_id, scheduled_time) -> log data
    log_lookup: dict[tuple[str, str], dict] = {}
    for log_doc in today_log_docs:
        ld = log_doc.to_dict()
        key = (ld["medicine_id"], ld["scheduled_time"])
        log_lookup[key] = ld

    schedule_items: list[DoseScheduleItem] = []

    for med_doc in active_docs:
        med_data = med_doc.to_dict()
        medicine_id = med_data["medicine_id"]
        medicine_name = med_data["name"]
        dose_times = _doc_to_dose_times(med_data.get("dose_times", []))

        # Check medicine is active for today (start_date <= today <= end_date if set)
        start_date_raw = med_data.get("start_date")
        if isinstance(start_date_raw, str):
            start_date_val = date.fromisoformat(start_date_raw)
        else:
            start_date_val = start_date_raw

        end_date_raw = med_data.get("end_date")
        if end_date_raw:
            if isinstance(end_date_raw, str):
                end_date_val = date.fromisoformat(end_date_raw)
            else:
                end_date_val = end_date_raw
            if today > end_date_val:
                continue

        if start_date_val and today < start_date_val:
            continue

        for dt in dose_times:
            key = (medicine_id, dt.time)
            log = log_lookup.get(key)

            taken = False
            taken_at = None
            skipped = False
            skip_reason = None
            overdue = False

            if log:
                action = log.get("action", "")
                if action == "taken":
                    taken = True
                    taken_at = log.get("actual_time") or log.get("created_at")
                elif action == "skipped":
                    skipped = True
                    skip_reason = log.get("skip_reason")
            else:
                # Check if overdue
                hour, minute = map(int, dt.time.split(":"))
                dose_dt_ist = datetime(today.year, today.month, today.day, hour, minute, tzinfo=IST)
                if dose_dt_ist < overdue_cutoff:
                    overdue = True

            schedule_items.append(
                DoseScheduleItem(
                    medicine_id=medicine_id,
                    medicine_name=medicine_name,
                    dose_time=dt.time,
                    dose_amount=dt.dose_amount,
                    dose_unit=dt.dose_unit,
                    taken=taken,
                    taken_at=taken_at,
                    skipped=skipped,
                    skip_reason=skip_reason,
                    overdue=overdue,
                )
            )

    # Sort by dose_time
    schedule_items.sort(key=lambda x: x.dose_time)

    total_doses = len(schedule_items)
    taken_count = sum(1 for s in schedule_items if s.taken)
    skipped_count = sum(1 for s in schedule_items if s.skipped)
    pending_count = sum(1 for s in schedule_items if not s.taken and not s.skipped)
    missed_count = sum(1 for s in schedule_items if s.overdue and not s.taken and not s.skipped)

    adherence_pct_today = 0.0
    completed = total_doses - pending_count
    if completed > 0:
        adherence_pct_today = round(taken_count / completed * 100.0, 1)

    return TodayScheduleResponse(
        date=today,
        schedule=schedule_items,
        total_doses=total_doses,
        taken_count=taken_count,
        missed_count=missed_count,
        pending_count=pending_count,
        adherence_pct_today=adherence_pct_today,
    )


async def log_dose(
    uid: str,
    medicine_id: str,
    req: DoseLogRequest,
    db: AsyncClient,
) -> DoseLogResponse:
    medicine_ref = (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .document(medicine_id)
    )
    doc = await medicine_ref.get()
    if not doc.exists:
        raise NotFoundError("Medicine")

    med_data = doc.to_dict()
    medicine_name = med_data["name"]
    now = datetime.now(timezone.utc)
    today_str = now.astimezone(IST).date().isoformat()

    log_id = str(uuid4())
    updated_stock = med_data.get("current_stock", 0)

    # Find dose amount for this scheduled time
    dose_times = _doc_to_dose_times(med_data.get("dose_times", []))
    dose_amount = 1.0
    for dt in dose_times:
        if dt.time == req.scheduled_time:
            dose_amount = dt.dose_amount
            break

    if req.action == "taken":
        # Use Firestore transaction to atomically decrement stock
        transaction = db.transaction()

        @transactional
        async def _decrement_stock(transaction, med_ref, current_stock: int, dose_amt: float, reorder_threshold: int, dpd: float):
            new_stock = max(0, current_stock - int(dose_amt))
            new_dsr = _days_supply(new_stock, dpd)
            new_refill_alert = new_dsr < reorder_threshold
            transaction.update(med_ref, {
                "current_stock": new_stock,
                "days_supply_remaining": new_dsr,
                "refill_alert": new_refill_alert,
                "updated_at": now,
            })
            return new_stock

        freq = MedicineFrequency(med_data["frequency"])
        dpd = _doses_per_day(freq, med_data.get("every_x_hours"))
        reorder_threshold = med_data.get("reorder_threshold", 7)
        current_stock = med_data.get("current_stock", 0)
        updated_stock = await _decrement_stock(
            transaction, medicine_ref, current_stock, dose_amount, reorder_threshold, dpd
        )

    log_data: dict = {
        "log_id": log_id,
        "uid": uid,
        "medicine_id": medicine_id,
        "medicine_name": medicine_name,
        "action": req.action,
        "scheduled_time": req.scheduled_time,
        "log_date": today_str,
        "actual_time": req.actual_time or (now if req.action == "taken" else None),
        "skip_reason": req.skip_reason,
        "notes": req.notes,
        "dose_amount": dose_amount,
        "created_at": now,
    }

    await (
        db.collection("users")
        .document(uid)
        .collection("medicine_logs")
        .document(log_id)
        .set(log_data)
    )

    return DoseLogResponse(
        log_id=log_id,
        medicine_id=medicine_id,
        medicine_name=medicine_name,
        action=req.action,
        scheduled_time=req.scheduled_time,
        actual_time=log_data["actual_time"],
        skip_reason=req.skip_reason,
        notes=req.notes,
        created_at=now,
        updated_stock=updated_stock,
    )


async def list_dose_logs(
    uid: str,
    medicine_id: str,
    start_date: date,
    end_date: date,
    limit: int,
    db: AsyncClient,
) -> DoseLogListResponse:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .document(medicine_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Medicine")

    logs_ref = db.collection("users").document(uid).collection("medicine_logs")
    query = (
        logs_ref
        .where("medicine_id", "==", medicine_id)
        .where("log_date", ">=", start_date.isoformat())
        .where("log_date", "<=", end_date.isoformat())
        .order_by("log_date", direction="DESCENDING")
        .limit(limit)
    )
    log_docs = [d async for d in query.stream()]

    logs: list[DoseLogResponse] = []
    total_taken = 0
    total_skipped = 0

    for ld in log_docs:
        ldata = ld.to_dict()
        action = ldata.get("action", "")
        if action == "taken":
            total_taken += 1
        elif action == "skipped":
            total_skipped += 1

        logs.append(
            DoseLogResponse(
                log_id=ldata["log_id"],
                medicine_id=ldata["medicine_id"],
                medicine_name=ldata["medicine_name"],
                action=action,
                scheduled_time=ldata["scheduled_time"],
                actual_time=ldata.get("actual_time"),
                skip_reason=ldata.get("skip_reason"),
                notes=ldata.get("notes"),
                created_at=ldata["created_at"],
                updated_stock=0,  # not stored in log, return 0
            )
        )

    med_data = doc.to_dict()
    freq = MedicineFrequency(med_data["frequency"])
    dpd = _doses_per_day(freq, med_data.get("every_x_hours"))
    days = max((end_date - start_date).days + 1, 1)
    total_scheduled = int(dpd * days) if dpd > 0 else 0
    adherence_pct = 0.0
    if total_scheduled > 0:
        adherence_pct = round(min(total_taken / total_scheduled * 100.0, 100.0), 1)

    return DoseLogListResponse(
        logs=logs,
        adherence_pct=adherence_pct,
        total_scheduled=total_scheduled,
        total_taken=total_taken,
        total_skipped=total_skipped,
    )


async def record_refill(
    uid: str,
    medicine_id: str,
    req: RefillRequest,
    db: AsyncClient,
) -> MedicineResponse:
    medicine_ref = (
        db.collection("users")
        .document(uid)
        .collection("medicines")
        .document(medicine_id)
    )
    doc = await medicine_ref.get()
    if not doc.exists:
        raise NotFoundError("Medicine")

    med_data = doc.to_dict()
    now = datetime.now(timezone.utc)

    new_stock = med_data.get("current_stock", 0) + req.quantity_added
    freq = MedicineFrequency(med_data["frequency"])
    dpd = _doses_per_day(freq, med_data.get("every_x_hours"))
    new_dsr = _days_supply(new_stock, dpd)
    reorder_threshold = med_data.get("reorder_threshold", 7)
    new_refill_alert = new_dsr < reorder_threshold

    await medicine_ref.update({
        "current_stock": new_stock,
        "days_supply_remaining": new_dsr,
        "refill_alert": new_refill_alert,
        "updated_at": now,
    })

    log_id = str(uuid4())
    refill_log_data: dict = {
        "log_id": log_id,
        "uid": uid,
        "medicine_id": medicine_id,
        "medicine_name": med_data["name"],
        "quantity_added": req.quantity_added,
        "purchase_date": req.purchase_date.isoformat(),
        "cost": req.cost,
        "pharmacy_name": req.pharmacy_name,
        "notes": req.notes,
        "stock_before": med_data.get("current_stock", 0),
        "stock_after": new_stock,
        "created_at": now,
    }
    await (
        db.collection("users")
        .document(uid)
        .collection("medicine_refill_logs")
        .document(log_id)
        .set(refill_log_data)
    )

    updated_doc = await medicine_ref.get()
    data = updated_doc.to_dict()
    today = date.today()
    adh_7d = await _adherence_pct(uid, medicine_id, today - timedelta(days=7), today, dpd, db)
    adh_30d = await _adherence_pct(uid, medicine_id, today - timedelta(days=30), today, dpd, db)
    return _build_medicine_response(data, adh_7d, adh_30d)


async def get_adherence_summary(
    uid: str,
    period: str,
    db: AsyncClient,
) -> AdherenceSummaryResponse:
    period_days_map = {"7d": 7, "30d": 30, "90d": 90}
    num_days = period_days_map.get(period, 30)

    today = date.today()
    start_date = today - timedelta(days=num_days)

    # Fetch all active medicines
    medicines_ref = db.collection("users").document(uid).collection("medicines")
    active_query = medicines_ref.where("is_active", "==", True)
    active_docs = [d async for d in active_query.stream()]

    # Fetch all logs in the period
    logs_ref = db.collection("users").document(uid).collection("medicine_logs")
    logs_query = (
        logs_ref
        .where("log_date", ">=", start_date.isoformat())
        .where("log_date", "<=", today.isoformat())
    )
    log_docs = [d async for d in logs_query.stream()]

    # Group logs by medicine_id, date, and day_of_week
    taken_by_med: dict[str, int] = defaultdict(int)
    taken_by_day: dict[int, int] = defaultdict(int)  # day_of_week -> count
    scheduled_by_day: dict[int, int] = defaultdict(int)

    for ld in log_docs:
        ldata = ld.to_dict()
        if ldata.get("action") == "taken":
            taken_by_med[ldata["medicine_id"]] += 1
            log_date_raw = ldata.get("log_date", "")
            if log_date_raw:
                try:
                    log_date_val = date.fromisoformat(log_date_raw)
                    taken_by_day[log_date_val.weekday()] += 1
                except ValueError:
                    pass

    by_medicine: list[dict] = []
    total_taken = 0
    total_expected = 0

    for med_doc in active_docs:
        med_data = med_doc.to_dict()
        medicine_id = med_data["medicine_id"]
        freq = MedicineFrequency(med_data["frequency"])
        dpd = _doses_per_day(freq, med_data.get("every_x_hours"))
        expected = int(dpd * num_days) if dpd > 0 else 0
        taken = taken_by_med.get(medicine_id, 0)
        med_adherence = round(min(taken / expected * 100.0, 100.0), 1) if expected > 0 else 100.0

        by_medicine.append({
            "medicine_id": medicine_id,
            "medicine_name": med_data["name"],
            "adherence_pct": med_adherence,
            "taken": taken,
            "expected": expected,
        })
        total_taken += taken
        total_expected += expected

    # Compute expected by day of week across all active medicines
    for med_doc in active_docs:
        med_data = med_doc.to_dict()
        freq = MedicineFrequency(med_data["frequency"])
        dpd = _doses_per_day(freq, med_data.get("every_x_hours"))
        doses_per_week = dpd * 7
        daily_expected = dpd
        for dow in range(7):
            scheduled_by_day[dow] += int(daily_expected * (num_days / 7))

    overall_adherence = 0.0
    if total_expected > 0:
        overall_adherence = round(min(total_taken / total_expected * 100.0, 100.0), 1)

    best_day: str | None = None
    worst_day: str | None = None
    if taken_by_day:
        # Normalize by expected
        day_adherence: dict[int, float] = {}
        for dow in range(7):
            exp = scheduled_by_day.get(dow, 0)
            tak = taken_by_day.get(dow, 0)
            day_adherence[dow] = (tak / exp * 100.0) if exp > 0 else 0.0
        best_dow = max(day_adherence, key=lambda k: day_adherence[k])
        worst_dow = min(day_adherence, key=lambda k: day_adherence[k])
        best_day = _DAY_NAMES[best_dow]
        worst_day = _DAY_NAMES[worst_dow]

    # Compute streak: consecutive days with >= 1 taken dose
    taken_dates: set[str] = set()
    for ld in log_docs:
        ldata = ld.to_dict()
        if ldata.get("action") == "taken":
            taken_dates.add(ldata.get("log_date", ""))

    streak_days = 0
    current_day = today
    while current_day >= start_date:
        if current_day.isoformat() in taken_dates:
            streak_days += 1
            current_day -= timedelta(days=1)
        else:
            break

    return AdherenceSummaryResponse(
        period=period,
        overall_adherence_pct=overall_adherence,
        by_medicine=by_medicine,
        best_day_of_week=best_day,
        worst_day_of_week=worst_day,
        streak_days=streak_days,
    )
