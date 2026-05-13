"""
Workers — Commission Confirmation Job

Affiliate networks have a 30-60 day reversal window.
After that window, commissions are confirmed and move from
pending_balance to wallet_balance (withdrawable).

This job runs nightly via a cron trigger (GitHub Actions or Railway cron).
It finds clicks older than the reversal window that were converted but
not yet confirmed, and moves the commission to wallet_balance.

Schedule: Daily at 02:00 UTC
Runtime: ~30 seconds for 10K conversions

Future:
- Replace with proper background job queue (ARQ or Celery)
- Add Slack notification when payout thresholds are crossed
- Send creator email digest (weekly earnings summary via Resend)
"""

import asyncio
import asyncpg
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:DiskCart5@localhost:5432/sett-db")

# Standard affiliate reversal window
REVERSAL_WINDOW_DAYS = 60


async def confirm_commissions():
    """Move pending commissions to wallet_balance after reversal window."""
    conn = await asyncpg.connect(DATABASE_URL)
    cutoff = datetime.now(timezone.utc) - timedelta(days=REVERSAL_WINDOW_DAYS)

    try:
        # Find converted clicks past the reversal window, not yet wallet-credited
        # Use a simple flag column: confirmed = TRUE once credited to wallet
        rows = await conn.fetch(
            """
            SELECT creator_id, SUM(commission_creator) AS total
            FROM affiliate_clicks
            WHERE converted = TRUE
              AND conversion_ts < $1
              AND confirmed IS NOT TRUE
            GROUP BY creator_id
            """,
            cutoff,
        )

        if not rows:
            print("No commissions to confirm.")
            return

        confirmed_count = 0
        total_amount = 0.0

        async with conn.transaction():
            for row in rows:
                creator_id = row["creator_id"]
                amount = float(row["total"])

                # Move from pending to wallet
                await conn.execute(
                    """
                    UPDATE users SET
                        wallet_balance = wallet_balance + $1,
                        pending_balance = GREATEST(pending_balance - $1, 0),
                        total_earned = total_earned + $1
                    WHERE id = $2
                    """,
                    amount, creator_id,
                )

                # Mark clicks as confirmed
                await conn.execute(
                    """
                    UPDATE affiliate_clicks
                    SET confirmed = TRUE
                    WHERE creator_id = $1
                      AND converted = TRUE
                      AND conversion_ts < $2
                      AND confirmed IS NOT TRUE
                    """,
                    creator_id, cutoff,
                )

                confirmed_count += 1
                total_amount += amount

        print(f"✓ Confirmed commissions for {confirmed_count} creators, total: ${total_amount:.2f}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(confirm_commissions())
