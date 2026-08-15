from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.redis_client import redis_client

RATE_LIMITED_PREFIXES = ("/api/v1/verification",)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limiting on OTP/verification endpoints, per Section 15/16."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith(RATE_LIMITED_PREFIXES) and request.method == "POST":
            client_ip = request.client.host if request.client else "unknown"
            key = f"ratelimit:{client_ip}:{request.url.path}"
            count = redis_client.incr(key)
            if count == 1:
                redis_client.expire(key, 60)
            if count > settings.OTP_RATE_LIMIT_PER_MINUTE:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": "Too many verification requests. Please wait a moment and try again.",
                        },
                    },
                )
        return await call_next(request)
