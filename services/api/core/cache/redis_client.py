"""
Platform — Redis Cache (Upstash)

Used for:
  - Session token caching (reduce DB lookups on every request)
  - Feed caching (featured sets, trending)
  - Rate limiting counters
  - Background job queue (future: replace FastAPI BackgroundTasks)
  - Referral code lookups

At launch: Upstash free tier (10K commands/day, 256 MB)
At 10K MAU: Upstash Pay-as-you-go (~$0.002/10K commands)

All cache keys use a namespace prefix: sett:{domain}:{key}
TTLs are explicit on every SET — never cache without an expiry.

Future:
  - Redis Pub/Sub for real-time notifications (item processing done, new follower)
  - Sorted sets for leaderboards (challenge rankings)
  - Bloom filter for efficient "has user seen this set" tracking
"""

import json
import redis.asyncio as aioredis
from typing import Optional, Any
from core.config.settings import settings
from core.logging.logger import get_logger

logger = get_logger(__name__)

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Get or create the Redis connection."""
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=2,
        )
    return _redis


async def cache_get(key: str) -> Optional[Any]:
    """Get a cached value. Returns None on miss or error."""
    try:
        r = await get_redis()
        value = await r.get(f"sett:{key}")
        return json.loads(value) if value else None
    except Exception as e:
        logger.warning("Cache GET failed", key=key, error=str(e))
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Set a cached value with TTL (seconds). Never cache without TTL."""
    try:
        r = await get_redis()
        await r.setex(f"sett:{key}", ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning("Cache SET failed", key=key, error=str(e))


async def cache_delete(key: str) -> None:
    """Invalidate a cache key."""
    try:
        r = await get_redis()
        await r.delete(f"sett:{key}")
    except Exception as e:
        logger.warning("Cache DELETE failed", key=key, error=str(e))


async def rate_limit_check(key: str, limit: int, window: int) -> bool:
    """
    Simple sliding window rate limiter.
    Returns True if request is allowed, False if rate limited.

    key:    e.g. "ratelimit:clip:{user_id}"
    limit:  max requests in window
    window: window size in seconds
    """
    try:
        r = await get_redis()
        full_key = f"sett:ratelimit:{key}"
        count = await r.incr(full_key)
        if count == 1:
            await r.expire(full_key, window)
        return count <= limit
    except Exception:
        return True  # Fail open — don't block requests on cache errors
