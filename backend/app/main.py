from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.firebase import init_firebase

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_firebase()
    yield
    # Shutdown — nothing to clean up


app = FastAPI(
    title="Kutumb Health API",
    description="Voice-first family health tracking for Indian families.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────

from app.routers import auth, users, family, checkins, medicines, health, emergency, referrals, wearable, lab_reports, insights
from app.routers.ai import session as ai_session
from app.routers.ai import onboard as ai_onboard
from app.routers.ai import memory as ai_memory

app.include_router(auth.router,         prefix="/api/v1/auth",         tags=["auth"])
app.include_router(users.router,        prefix="/api/v1/users",        tags=["users"])
app.include_router(family.router,       prefix="/api/v1/family",       tags=["family"])
app.include_router(checkins.router,     prefix="/api/v1/checkins",     tags=["checkins"])
app.include_router(medicines.router,    prefix="/api/v1/medicines",    tags=["medicines"])
app.include_router(health.router,       prefix="/api/v1/health",       tags=["health"])
app.include_router(emergency.router,    prefix="/api/v1/emergency",    tags=["emergency"])
app.include_router(referrals.router,    prefix="/api/v1/referrals",    tags=["referrals"])
app.include_router(wearable.router,     prefix="/api/v1/wearable",     tags=["wearable"])
app.include_router(lab_reports.router,  prefix="/api/v1/lab_reports",  tags=["lab_reports"])
app.include_router(insights.router,     prefix="/api/v1/insights",     tags=["insights"])
app.include_router(ai_session.router,   prefix="/api/v1/ai/session",   tags=["ai"])
app.include_router(ai_onboard.router,   prefix="/api/v1/ai/session/onboard", tags=["ai"])
app.include_router(ai_memory.router,    prefix="/api/v1/ai/memory",    tags=["ai"])


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health_check():
    return JSONResponse({"status": "ok", "service": "kutumb-api", "version": "1.0.0"})


@app.get("/", tags=["system"])
async def root():
    return JSONResponse({"message": "Kutumb Health API", "docs": "/docs"})
