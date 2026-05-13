"""SETT API — FastAPI entry point.
Domain-driven modular monolith. Each domain router is self-contained.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exceptions import ResponseValidationError
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Any
from pathlib import Path

from core.config.settings import settings
from core.logging.logger import setup_logging, get_logger
from core.database.connection import init_db, close_db

from domains.users.routes import router as users_router
from domains.items.routes import router as items_router
from domains.sets.routes import router as sets_router
from domains.canvas.routes import router as canvas_router
from domains.commerce.routes import router as commerce_router
from domains.referrals.routes import router as referrals_router
from domains.analytics.routes import router as analytics_router
from domains.challenges.routes import router as challenges_router
from domains.ai.routes import router as ai_router
from domains.trends.routes import router as trends_router
from domains.notifications.routes import router as notifications_router  # NEW

setup_logging()
logger = get_logger(__name__)


def _coerce_for_json(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: _coerce_for_json(v) for k, v in data.items()}
    if isinstance(data, (list, tuple)):
        return [_coerce_for_json(v) for v in data]
    if isinstance(data, UUID):
        return str(data)
    if isinstance(data, datetime):
        return data.isoformat()
    if isinstance(data, Decimal):
        return float(data)
    return data


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SETT API starting", env=settings.environment)
    await init_db()
    yield
    logger.info("SETT API shutting down")
    await close_db()


app = FastAPI(
    title="SETT API",
    description="Style it. Share it. Shop it.",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)


# ── Exception Handlers ───────────────────────────────────────

@app.exception_handler(ResponseValidationError)
async def response_validation_handler(request: Request, exc: ResponseValidationError):
    coerced = _coerce_for_json(exc.body)
    logger.warning(
        "Response validation coerced",
        path=request.url.path,
        errors=[e["msg"] for e in exc.errors()],
    )
    return JSONResponse(content=coerced, status_code=200)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception",
        path=request.url.path,
        error=str(exc),
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── Middleware ────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    allow_origin_regex=r"^https?://(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|0\.0\.0\.0(:\d+)?)$",
    allow_origins=settings.cors_origins,
)


# ── Routers ──────────────────────────────────────────────────

app.include_router(users_router,          prefix="/api/users",          tags=["users"])
app.include_router(canvas_router,         prefix="/api/canvas",         tags=["canvas"])
app.include_router(items_router,          prefix="/api/items",          tags=["items"])
app.include_router(sets_router,           prefix="/api/sets",           tags=["sets"])
app.include_router(commerce_router,       prefix="/api/commerce",       tags=["commerce"])
app.include_router(referrals_router,      prefix="/api/referrals",      tags=["referrals"])
app.include_router(analytics_router,      prefix="/api/analytics",      tags=["analytics"])
app.include_router(challenges_router,     prefix="/api/challenges",     tags=["challenges"])
app.include_router(ai_router,             prefix="/api/ai",             tags=["ai"])
app.include_router(trends_router,         prefix="/api/trends",         tags=["trends"])
app.include_router(notifications_router,  prefix="/api/notifications",  tags=["notifications"])  # NEW


@app.get("/health", tags=["system"])
async def health():
    from core.database.connection import check_db_health
    db_ok = await check_db_health()
    return {"status": "ok" if db_ok else "degraded", "version": "1.0.0", "db": "ok" if db_ok else "error"}


@app.get("/api/test", tags=["system"])
async def api_test():
    return {"message": "SETT API is running.", "tagline": "Style it. Share it. Shop it."}


# ── Local image uploads ──────────────────────────────────────

_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
_UPLOADS_ITEMS_DIR = _UPLOADS_DIR / "items"
_UPLOADS_ITEMS_DIR.mkdir(parents=True, exist_ok=True)
_UPLOADS_SETS_DIR = _UPLOADS_DIR / "sets"
_UPLOADS_SETS_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/uploads/items/{filename}")
async def serve_item_upload(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not filename.endswith(".png"):
        raise HTTPException(status_code=400, detail="Only PNG files")
    filepath = _UPLOADS_ITEMS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(filepath, media_type="image/png")


@app.get("/uploads/sets/{filename}")
async def serve_set_upload(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not filename.endswith(".png"):
        raise HTTPException(status_code=400, detail="Only PNG files")
    filepath = _UPLOADS_SETS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(filepath, media_type="image/png")


logger.info(
    "CORS configured",
    origins=settings.cors_origins,
    env=settings.environment,
)