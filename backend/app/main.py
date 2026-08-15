import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.responses import ApiError
from app.middleware.rate_limit import RateLimitMiddleware
from app.api.routes import auth, customers, requests as requests_route, verification, admin, audit, branches, notifications

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("bank_locker_backend")

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Centralized backend for the Digital Bank Locker Management Platform. "
        "Digitizes the controlled workflow around bank lockers: customer request → "
        "identity verification → dual-token verification → bank authorization → "
        "locker operation → state update → audit event."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("request_id=%s endpoint=%s failed", request_id, request.url.path)
        raise
    duration_ms = round((time.time() - start) * 1000, 2)
    logger.info(
        "request_id=%s method=%s endpoint=%s status=%s duration_ms=%s",
        request_id, request.method, request.url.path, response.status_code, duration_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(ApiError)
async def api_error_handler(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Never leak stack traces to clients (Section 15/27).
    logger.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )


app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(requests_route.router)
app.include_router(verification.router)
app.include_router(admin.router)
app.include_router(audit.router)
app.include_router(branches.router)
app.include_router(notifications.router)


@app.get("/health", tags=["System"], summary="Health check for orchestration/monitoring")
def health():
    from app.core.database import engine
    from app.core.redis_client import redis_client as rc
    db_ok, redis_ok = True, True
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except Exception:
        db_ok = False
    try:
        rc.ping()
    except Exception:
        redis_ok = False
    status = "healthy" if db_ok and redis_ok else "degraded"
    return {"status": status, "database": db_ok, "redis": redis_ok}


@app.get("/", tags=["System"])
def root():
    return {"service": settings.APP_NAME, "docs": "/docs", "health": "/health"}
