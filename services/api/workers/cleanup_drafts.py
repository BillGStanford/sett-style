"""
Workers — Draft Cleanup Job

Soft-deletes canvas drafts that:
- Were never published
- Are older than 90 days
- Have no canvas_json (empty canvases)

Run weekly. Keeps the database clean and reduces storage costs.
"""

import asyncio
import asyncpg
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:DiskCart5@localhost:5432/sett-db")


async def cleanup_drafts():
    conn = await asyncpg.connect(DATABASE_URL)
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    try:
        result = await conn.execute(
            """
            UPDATE sets SET deleted_at = NOW()
            WHERE is_published = FALSE
              AND deleted_at IS NULL
              AND created_at < $1
              AND (canvas_json = '{}' OR canvas_json IS NULL)
            """,
            cutoff,
        )
        print(f"✓ Cleaned up stale empty drafts older than 90 days. Result: {result}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(cleanup_drafts())
