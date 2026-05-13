"""
SETT API — PostgreSQL connection management.

Uses asyncpg for fully async database access.
Connection pool is managed at application lifespan (startup/shutdown).

Why asyncpg over SQLAlchemy / Prisma:
- Zero ORM overhead — raw SQL for predictable query performance
- asyncpg is the fastest PostgreSQL driver for Python (benchmarked)
- Explicit SQL means no N+1 query surprises
- Easy to optimize individual queries without fighting an ORM

Connection pool sizing:
- Min: 2 (always ready)
- Max: 10 (adjustable via env var)
- At 50K+ concurrent users: increase max to 50, add PgBouncer in front

Transaction pattern:
  async with pool.acquire() as conn:
      async with conn.transaction():
          await conn.execute(...)

Future:
- Read replica routing (write → primary, read → replica)
- PgBouncer connection pooling in front of PostgreSQL
- Query analytics via pg_stat_statements
"""

import asyncpg
from typing import Optional
from core.config.settings import settings
from core.logging.logger import get_logger

logger = get_logger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_db() -> None:
    """Initialize the connection pool. Called at application startup."""
    global _pool
    try:
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
            command_timeout=30,
            # Set statement timeout to prevent runaway queries
            init=_set_connection_defaults,
        )
        logger.info("Database pool initialized", min=settings.db_pool_min_size, max=settings.db_pool_max_size)
    except Exception as e:
        logger.error("Failed to initialize database pool", error=str(e))
        raise


async def _set_connection_defaults(conn: asyncpg.Connection) -> None:
    """Set per-connection defaults. Called for each new connection in the pool."""
    await conn.execute("SET statement_timeout = '30s'")
    await conn.execute("SET lock_timeout = '5s'")


async def close_db() -> None:
    """Close the connection pool. Called at application shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")


async def check_db_health() -> bool:
    """Ping the database. Used by /health endpoint."""
    try:
        async with get_pool().acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception:
        return False


def get_pool() -> asyncpg.Pool:
    """Get the connection pool. Raises if not initialized."""
    if _pool is None:
        raise RuntimeError("Database pool is not initialized. Call init_db() first.")
    return _pool


async def get_conn():
    """
    FastAPI dependency — yields a database connection.

    Usage:
        @router.get("/items")
        async def get_items(conn = Depends(get_conn)):
            rows = await conn.fetch("SELECT * FROM items WHERE user_id = $1", user_id)
    """
    async with get_pool().acquire() as conn:
        yield conn
