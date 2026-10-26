"""Commerce Domain — Service Layer"""

import asyncpg
from typing import Optional
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from core.logging.logger import get_logger

logger = get_logger(__name__)

PLATFORM_SHARE = 0.30   # SETT keeps 30%
CREATOR_SHARE  = 0.70   # Creator earns 70%
PAYOUT_MINIMUM = 25.00  # Minimum balance to request payout


class CommerceService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_affiliate_url(self, item_id: str) -> Optional[str]:
        row = await self.conn.fetchrow(
            "SELECT affiliate_url FROM items WHERE id = $1 AND deleted_at IS NULL", item_id
        )
        return row["affiliate_url"] if row else None

    async def record_click(
        self,
        item_id: str,
        set_id: Optional[str],
        clicker_id: Optional[str],
        referrer: str,
        user_agent: str,
    ) -> dict:
        """
        Insert a click record and return its unique attribution reference.
        Uses creator_id from the item's owning user, not the clicker.
        """
        item = await self.conn.fetchrow(
            "SELECT user_id, merchant_id FROM items WHERE id = $1", item_id
        )
        if not item:
            return

        merchant = await self.conn.fetchrow(
            "SELECT network FROM merchants WHERE id = $1", item["merchant_id"]
        ) if item["merchant_id"] else None

        network = merchant["network"] if merchant else "unknown"
        click_ref = uuid4().hex
        await self.conn.execute(
            """
            INSERT INTO affiliate_clicks
              (item_id, set_id, creator_id, clicker_id, network, click_ref, referrer_url, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            item_id,
            set_id,
            item["user_id"],
            clicker_id,
            network,
            click_ref,
            referrer[:500],
            user_agent[:300],
        )
        return {"click_ref": click_ref, "network": network}

    async def process_conversion(
        self,
        network: str,
        click_ref: Optional[str],
        order_value: float,
        commission_gross: float,
    ) -> None:
        """
        Process a confirmed conversion from an affiliate network webhook.

        1. Find the matching click record by click_ref
        2. Calculate platform vs creator share
        3. Update the click as converted
        4. Credit creator's pending_balance
        5. Credit platform account (tracked in aggregate)

        Note: Pending balance, not wallet_balance — affiliate commissions have
        a 30-60 day reversal window. Money moves to wallet_balance after window closes.
        """
        if not click_ref:
            return

        click = await self.conn.fetchrow(
            "SELECT id, creator_id FROM affiliate_clicks WHERE click_ref = $1", click_ref
        )
        if not click:
            logger.warning("Conversion webhook: click not found", click_ref=click_ref, network=network)
            return

        commission_creator = round(commission_gross * CREATOR_SHARE, 2)
        commission_platform = round(commission_gross * PLATFORM_SHARE, 2)

        async with self.conn.transaction():
            converted_id = await self.conn.fetchval(
                """
                UPDATE affiliate_clicks SET
                    converted = TRUE,
                    conversion_ts = NOW(),
                    order_value = $1,
                    commission_gross = $2,
                    commission_creator = $3,
                    commission_platform = $4
                WHERE id = $5 AND converted = FALSE
                RETURNING id
                """,
                order_value, commission_gross, commission_creator, commission_platform, click["id"],
            )

            # Webhooks are commonly retried. Only credit the first successful transition.
            if converted_id:
                await self.conn.execute(
                    "UPDATE users SET pending_balance = pending_balance + $1 WHERE id = $2",
                    commission_creator, click["creator_id"],
                )

        logger.info(
            "Conversion processed",
            creator_id=str(click["creator_id"]),
            commission_creator=commission_creator,
            network=network,
        )

    async def get_creator_earnings(self, user_id: str) -> dict:
        """Full earnings dashboard data for a creator."""
        user = await self.conn.fetchrow(
            "SELECT wallet_balance, pending_balance, total_earned FROM users WHERE id = $1",
            user_id,
        )

        # This week's earnings
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        week_earnings = await self.conn.fetchval(
            """
            SELECT COALESCE(SUM(commission_creator), 0)
            FROM affiliate_clicks
            WHERE creator_id = $1 AND converted = TRUE AND conversion_ts >= $2
            """,
            user_id, week_ago,
        )

        # Total clicks (all time)
        total_clicks = await self.conn.fetchval(
            "SELECT COUNT(*) FROM affiliate_clicks WHERE creator_id = $1", user_id
        )

        # Total conversions
        total_conversions = await self.conn.fetchval(
            "SELECT COUNT(*) FROM affiliate_clicks WHERE creator_id = $1 AND converted = TRUE", user_id
        )

        # Top performing set
        top_set = await self.conn.fetchrow(
            """
            SELECT ac.set_id, s.title, COUNT(*) AS clicks,
                   COALESCE(SUM(ac.commission_creator), 0) AS revenue
            FROM affiliate_clicks ac
            JOIN sets s ON s.id = ac.set_id
            WHERE ac.creator_id = $1
            GROUP BY ac.set_id, s.title
            ORDER BY revenue DESC
            LIMIT 1
            """,
            user_id,
        )

        return {
            "wallet_balance": float(user["wallet_balance"]),
            "pending_balance": float(user["pending_balance"]),
            "total_earned": float(user["total_earned"]),
            "this_week": float(week_earnings),
            "total_clicks": int(total_clicks),
            "total_conversions": int(total_conversions),
            "conversion_rate": round(int(total_conversions) / max(int(total_clicks), 1) * 100, 2),
            "top_set": dict(top_set) if top_set else None,
            "payout_minimum": PAYOUT_MINIMUM,
            "can_request_payout": float(user["wallet_balance"]) >= PAYOUT_MINIMUM,
        }

    async def request_payout(self, user_id: str) -> dict:
        """Keep payouts disabled until a real provider and reconciliation flow exist.

        The previous implementation zeroed creator balances while only creating
        a placeholder database row. Failing safely prevents accidental loss of funds.
        """
        from fastapi import HTTPException

        raise HTTPException(
            status_code=503,
            detail=(
                "Creator payouts are temporarily unavailable while payment processing "
                "is being configured. Your available balance has not been changed."
            ),
        )
