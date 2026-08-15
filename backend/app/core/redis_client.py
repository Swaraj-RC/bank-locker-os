"""
Redis client with automatic local fallback.

For local/demo use, no separate Redis (or Memurai) install is required:
on import, we try a real connection to REDIS_URL; if it's unreachable we
transparently swap in an in-memory substitute that implements the same
subset of commands the app actually uses (setex/get/delete/incr/expire/ping).

This keeps app/services/verification_service.py and
app/middleware/rate_limit.py completely unaware of which backend is in use.
For production or Docker Compose deployments where Redis is genuinely
running, the real redis.Redis client is used as normal — nothing changes
there.
"""
import logging
import threading
import time

import redis as redis_lib

from app.core.config import settings

logger = logging.getLogger("bank_locker_backend")


class InMemoryRedis:
    """Minimal drop-in substitute for the subset of Redis commands this app
    uses. Not distributed, not persistent — fine for a single-process local
    demo, not for multi-instance production."""

    def __init__(self):
        self._store: dict = {}
        self._lock = threading.Lock()

    def _expired(self, key: str) -> bool:
        entry = self._store.get(key)
        if entry is None:
            return True
        _, expires_at = entry
        return expires_at is not None and time.time() > expires_at

    def setex(self, key: str, ttl: int, value):
        with self._lock:
            self._store[key] = (str(value), time.time() + ttl)
        return True

    def get(self, key: str):
        with self._lock:
            if self._expired(key):
                self._store.pop(key, None)
                return None
            return self._store[key][0]

    def delete(self, *keys: str):
        with self._lock:
            for k in keys:
                self._store.pop(k, None)
        return len(keys)

    def incr(self, key: str):
        with self._lock:
            if self._expired(key):
                self._store.pop(key, None)
            current = int(self._store.get(key, ("0", None))[0])
            current += 1
            _, expires_at = self._store.get(key, ("0", None))
            self._store[key] = (str(current), expires_at)
            return current

    def expire(self, key: str, ttl: int):
        with self._lock:
            entry = self._store.get(key)
            if entry:
                self._store[key] = (entry[0], time.time() + ttl)
        return True

    def ping(self):
        return True


def _build_client():
    client = redis_lib.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=1)
    try:
        client.ping()
        logger.info("Connected to real Redis at %s", settings.REDIS_URL)
        return client
    except Exception:
        logger.warning(
            "Redis unreachable at %s -- using in-memory substitute for local/demo use. "
            "Install and run Redis (or Memurai on Windows) and it will be used automatically.",
            settings.REDIS_URL,
        )
        return InMemoryRedis()


redis_client = _build_client()
