"""
Daily cron job: Aggregates trend signals from set_likes, sets, and affiliate_clicks.
Run via: python workers/aggregate_trends.py
Schedule: Daily at 00:00 UTC via infrastructure/jobs/jobs.py
"""

import asyncio
import sys
import os
from pathlib import Path

# Add services/api to path so we can import backend modules
API_DIR = Path(__file__).resolve().parent.parent / "services" / "api"
sys.path.insert(0, str(API_DIR))

# Set env vars so settings.py can load .env
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("DATABASE_URL", os.getenv("DATABASE_URL", ""))


async def run_aggregation():
    from core.database.connection import init_db, close_db
    from domains.trends.service import TrendsService
    from core.logging.logger import setup_logging, get_logger

    setup_logging()
    logger = get_logger(__name__)

    logger.info("Starting daily trend aggregation")
    
    try:
        pool = await init_db()
        async with pool.acquire() as conn:
            service = TrendsService(conn)
            result = await service.aggregate_trends()
            logger.info(
                "Trend aggregation complete",
                date_processed=result.date_processed,
                signals_created=result.signals_created,
            )
    except Exception as e:
        logger.error("Trend aggregation failed", error=str(e), exc_info=e)
        raise
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(run_aggregation())