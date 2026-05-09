from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from app.dependencies import DB
from app.services import referral_service

router = APIRouter()


@router.get("/referrals/{token}")
async def open_referral(token: str, db: DB):
    pdf_url = await referral_service.get_public_referral_url(token, db)
    return RedirectResponse(url=pdf_url)
