from datetime import datetime, timedelta, timezone
from uuid import uuid4

from google.cloud.firestore import AsyncClient

from app.core.enums import FamilyPermission
from app.core.exceptions import (
    AlreadyExistsError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.models.family import (
    AddFamilyMemberRequest,
    FamilyMember,
    FamilyMemberDashboard,
    FamilyMemberListResponse,
    UpdateFamilyMemberRequest,
)


def _doc_to_family_member(data: dict) -> FamilyMember:
    return FamilyMember(
        member_id=data["member_id"],
        target_uid=data.get("target_uid"),
        display_name=data["display_name"],
        relationship=data["relationship"],
        phone_number=data["phone_number"],
        permissions=[FamilyPermission(p) for p in data.get("permissions", [])],
        is_registered=data.get("is_registered", False),
        avatar_url=data.get("avatar_url"),
        added_at=data["added_at"],
    )


async def _find_uid_by_phone(phone_number: str, db: AsyncClient) -> str | None:
    """Return uid of a registered user with the given phone_number, or None."""
    query = db.collection("users").where("phone_number", "==", phone_number).limit(1)
    docs = [doc async for doc in query.stream()]
    if docs:
        return docs[0].id
    return None


async def list_family_members(uid: str, db: AsyncClient) -> FamilyMemberListResponse:
    ref = db.collection("users").document(uid).collection("family_members")
    docs = [doc async for doc in ref.stream()]
    members = [_doc_to_family_member(doc.to_dict()) for doc in docs]
    return FamilyMemberListResponse(members=members, total=len(members))


async def add_family_member(
    uid: str,
    req: AddFamilyMemberRequest,
    db: AsyncClient,
) -> FamilyMember:
    family_ref = db.collection("users").document(uid).collection("family_members")

    # Prevent duplicates by phone_number within this user's family
    existing_query = family_ref.where("phone_number", "==", req.phone_number).limit(1)
    existing_docs = [doc async for doc in existing_query.stream()]
    if existing_docs:
        raise AlreadyExistsError("Family member with this phone number")

    now = datetime.now(timezone.utc)
    member_id = str(uuid4())
    target_uid = await _find_uid_by_phone(req.phone_number, db)
    is_registered = target_uid is not None

    member_data: dict = {
        "member_id": member_id,
        "target_uid": target_uid,
        "display_name": req.display_name,
        "relationship": req.relationship,
        "phone_number": req.phone_number,
        "permissions": [p.value for p in req.permissions],
        "is_registered": is_registered,
        "avatar_url": None,
        "added_at": now,
    }
    await family_ref.document(member_id).set(member_data)

    # Create the invite document
    invite_id = str(uuid4())
    invite_data: dict = {
        "invite_id": invite_id,
        "inviter_uid": uid,
        "invitee_phone": req.phone_number,
        "member_id": member_id,
        "permissions": [p.value for p in req.permissions],
        "status": "pending",
        "created_at": now,
        "expires_at": now + timedelta(days=7),
    }
    await db.collection("family_invites").document(invite_id).set(invite_data)

    # If target_uid found, create a mirror/pending record in their family_members with
    # only RECEIVE_SOS so they can see the connection before accepting
    if target_uid:
        mirror_id = str(uuid4())
        mirror_data: dict = {
            "member_id": mirror_id,
            "target_uid": uid,
            "display_name": req.display_name,
            "relationship": req.relationship,
            "phone_number": req.phone_number,
            "permissions": [FamilyPermission.RECEIVE_SOS.value],
            "is_registered": True,
            "avatar_url": None,
            "added_at": now,
            "invite_status": "pending",
            "invite_id": invite_id,
        }
        await (
            db.collection("users")
            .document(target_uid)
            .collection("family_members")
            .document(mirror_id)
            .set(mirror_data)
        )

    return _doc_to_family_member(member_data)


async def get_family_member(
    uid: str,
    member_id: str,
    db: AsyncClient,
) -> FamilyMember:
    doc = await (
        db.collection("users")
        .document(uid)
        .collection("family_members")
        .document(member_id)
        .get()
    )
    if not doc.exists:
        raise NotFoundError("Family member")
    return _doc_to_family_member(doc.to_dict())


async def update_family_member(
    uid: str,
    member_id: str,
    req: UpdateFamilyMemberRequest,
    db: AsyncClient,
) -> FamilyMember:
    member_ref = (
        db.collection("users")
        .document(uid)
        .collection("family_members")
        .document(member_id)
    )
    doc = await member_ref.get()
    if not doc.exists:
        raise NotFoundError("Family member")

    updates: dict = {}
    if req.relationship is not None:
        updates["relationship"] = req.relationship
    if req.display_name is not None:
        updates["display_name"] = req.display_name
    if req.permissions is not None:
        updates["permissions"] = [p.value for p in req.permissions]

    if updates:
        await member_ref.update(updates)

    updated_doc = await member_ref.get()
    return _doc_to_family_member(updated_doc.to_dict())


async def remove_family_member(
    uid: str,
    member_id: str,
    db: AsyncClient,
) -> None:
    member_ref = (
        db.collection("users")
        .document(uid)
        .collection("family_members")
        .document(member_id)
    )
    doc = await member_ref.get()
    if not doc.exists:
        raise NotFoundError("Family member")

    data = doc.to_dict()
    await member_ref.delete()

    # Remove the mirror record on the other side if it exists
    target_uid = data.get("target_uid")
    if target_uid:
        target_family_ref = (
            db.collection("users").document(target_uid).collection("family_members")
        )
        reverse_query = target_family_ref.where("target_uid", "==", uid).limit(1)
        reverse_docs = [d async for d in reverse_query.stream()]
        for d in reverse_docs:
            await d.reference.delete()


async def accept_invite(
    invite_id: str,
    uid: str,
    phone_number: str,
    db: AsyncClient,
) -> FamilyMember:
    invite_ref = db.collection("family_invites").document(invite_id)
    invite_doc = await invite_ref.get()
    if not invite_doc.exists:
        raise NotFoundError("Invite")

    invite = invite_doc.to_dict()

    if invite.get("invitee_phone") != phone_number:
        raise ForbiddenError("This invite does not belong to your phone number")

    if invite.get("status") != "pending":
        raise ConflictError(f"Invite is already {invite.get('status')}")

    expires_at = invite.get("expires_at")
    now = datetime.now(timezone.utc)
    if expires_at is not None:
        # Firestore timestamps are already timezone-aware; convert if needed
        if hasattr(expires_at, "timestamp"):
            expires_at_aware = expires_at.replace(tzinfo=timezone.utc) if expires_at.tzinfo is None else expires_at
        else:
            expires_at_aware = expires_at
        if now > expires_at_aware:
            raise ConflictError("Invite has expired")

    inviter_uid: str = invite["inviter_uid"]
    permissions: list[str] = invite.get("permissions", [])

    # Mark invite accepted
    await invite_ref.update({"status": "accepted", "accepted_at": now})

    # Update the existing member record in the inviter's family_members (set target_uid)
    inviter_family_ref = (
        db.collection("users").document(inviter_uid).collection("family_members")
    )
    inviter_member_query = inviter_family_ref.where("phone_number", "==", phone_number).limit(1)
    inviter_member_docs = [d async for d in inviter_member_query.stream()]
    if inviter_member_docs:
        await inviter_member_docs[0].reference.update(
            {"target_uid": uid, "is_registered": True}
        )

    # Build the full bidirectional record in the acceptor's family_members
    # (replace any pending mirror that may have been created during add_family_member)
    acceptor_family_ref = (
        db.collection("users").document(uid).collection("family_members")
    )
    existing_query = acceptor_family_ref.where("target_uid", "==", inviter_uid).limit(1)
    existing_docs = [d async for d in existing_query.stream()]

    acceptor_member_id: str
    if existing_docs:
        acceptor_member_ref = existing_docs[0].reference
        await acceptor_member_ref.update(
            {
                "permissions": permissions,
                "invite_status": "accepted",
                "is_registered": True,
            }
        )
        acceptor_member_id = existing_docs[0].id
        acceptor_data = existing_docs[0].to_dict()
        acceptor_data["permissions"] = permissions
        acceptor_data["invite_status"] = "accepted"
        acceptor_data["is_registered"] = True
    else:
        # Create fresh bidirectional record
        acceptor_member_id = str(uuid4())
        inviter_user_doc = await db.collection("users").document(inviter_uid).get()
        inviter_display = inviter_user_doc.to_dict().get("display_name", "") if inviter_user_doc.exists else ""
        inviter_phone = inviter_user_doc.to_dict().get("phone_number", "") if inviter_user_doc.exists else ""

        acceptor_data = {
            "member_id": acceptor_member_id,
            "target_uid": inviter_uid,
            "display_name": inviter_display,
            "relationship": "family",
            "phone_number": inviter_phone,
            "permissions": permissions,
            "is_registered": True,
            "avatar_url": None,
            "added_at": now,
            "invite_status": "accepted",
        }
        await acceptor_family_ref.document(acceptor_member_id).set(acceptor_data)

    return _doc_to_family_member(acceptor_data)


async def decline_invite(
    invite_id: str,
    uid: str,
    phone_number: str,
    db: AsyncClient,
) -> None:
    invite_ref = db.collection("family_invites").document(invite_id)
    invite_doc = await invite_ref.get()
    if not invite_doc.exists:
        raise NotFoundError("Invite")

    invite = invite_doc.to_dict()

    if invite.get("invitee_phone") != phone_number:
        raise ForbiddenError("This invite does not belong to your phone number")

    if invite.get("status") != "pending":
        raise ConflictError(f"Invite is already {invite.get('status')}")

    await invite_ref.update({"status": "declined", "declined_at": datetime.now(timezone.utc)})

    # Remove the pending mirror record in this user's family_members, if present
    inviter_uid: str = invite["inviter_uid"]
    acceptor_family_ref = (
        db.collection("users").document(uid).collection("family_members")
    )
    mirror_query = acceptor_family_ref.where("target_uid", "==", inviter_uid).limit(1)
    mirror_docs = [d async for d in mirror_query.stream()]
    for d in mirror_docs:
        d_data = d.to_dict()
        if d_data.get("invite_status") == "pending":
            await d.reference.delete()


async def get_family_dashboard(
    uid: str,
    member_id: str,
    current_uid: str,
    db: AsyncClient,
) -> FamilyMemberDashboard:
    """
    `uid`        - the owner whose family list we look in (current requester)
    `member_id`  - the family member record ID
    `current_uid`- the authenticated user (same as uid unless called from elsewhere)
    """
    member_ref = (
        db.collection("users")
        .document(uid)
        .collection("family_members")
        .document(member_id)
    )
    doc = await member_ref.get()
    if not doc.exists:
        raise NotFoundError("Family member")

    data = doc.to_dict()
    target_uid: str | None = data.get("target_uid")
    if not target_uid:
        raise ValidationError("Family member has not registered yet; dashboard unavailable")

    permissions = [FamilyPermission(p) for p in data.get("permissions", [])]
    has_full = FamilyPermission.FULL_ACCESS in permissions

    def _has(perm: FamilyPermission) -> bool:
        return has_full or perm in permissions

    # Latest check-in
    latest_checkin: dict | None = None
    if _has(FamilyPermission.VIEW_CHECKINS):
        checkins_ref = (
            db.collection("users").document(target_uid).collection("checkins")
        )
        checkin_query = checkins_ref.order_by("checkin_date", direction="DESCENDING").limit(1)
        checkin_docs = [d async for d in checkin_query.stream()]
        if checkin_docs:
            latest_checkin = checkin_docs[0].to_dict()

    # Medicine adherence percentage (last 30 days)
    medicine_adherence_pct: float | None = None
    if _has(FamilyPermission.VIEW_MEDICINES):
        medicines_ref = (
            db.collection("users").document(target_uid).collection("medicines")
        )
        med_query = medicines_ref.where("is_active", "==", True)
        med_docs = [d async for d in med_query.stream()]
        if med_docs:
            from datetime import date, timedelta

            today = date.today()
            thirty_days_ago = (today - timedelta(days=30)).isoformat()
            checkins_ref = (
                db.collection("users").document(target_uid).collection("checkins")
            )
            adherence_query = checkins_ref.where("checkin_date", ">=", thirty_days_ago)
            adherence_docs = [d async for d in adherence_query.stream()]

            total_expected = len(med_docs) * 30
            taken_count = 0
            for ad in adherence_docs:
                ad_data = ad.to_dict()
                taken_count += len(ad_data.get("medicine_adherence_ids", []))

            if total_expected > 0:
                medicine_adherence_pct = round(
                    min(taken_count / total_expected, 1.0) * 100, 1
                )

    # Health scores
    health_scores: dict | None = None
    if _has(FamilyPermission.VIEW_HEALTH_SCORES):
        scores_ref = db.collection("users").document(target_uid).collection("health_scores")
        scores_query = scores_ref.order_by("scored_at", direction="DESCENDING").limit(1)
        scores_docs = [d async for d in scores_query.stream()]
        if scores_docs:
            health_scores = scores_docs[0].to_dict()

    # SOS events count
    sos_events_count: int | None = None
    if _has(FamilyPermission.RECEIVE_SOS):
        sos_ref = db.collection("users").document(target_uid).collection("sos_events")
        sos_docs = [d async for d in sos_ref.stream()]
        sos_events_count = len(sos_docs)

    return FamilyMemberDashboard(
        member_id=member_id,
        target_uid=target_uid,
        display_name=data["display_name"],
        permissions=permissions,
        latest_checkin=latest_checkin,
        medicine_adherence_pct=medicine_adherence_pct,
        health_scores=health_scores,
        sos_events_count=sos_events_count,
    )
