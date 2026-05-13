"""Trends Domain — Service Layer"""

import asyncpg
from typing import Optional, List
from datetime import date, datetime, timedelta, timezone

from domains.trends.schemas import (
    TrendPeriodSchema,
    TrendTrajectorySchema,
    TrendTeaserSchema,
    TrendMetricSummary,
    TrendTrajectoryPoint,
    TrendRefreshResponse,
)
from core.logging.logger import get_logger

logger = get_logger(__name__)


class TrendsService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_trending_teasers(self, limit: int = 3) -> List[TrendTeaserSchema]:
        """Public endpoint: top 3 rising aesthetics based on 7-day likes + saves."""
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        fourteen_days_ago = today - timedelta(days=14)

        rows = await self.conn.fetch(
            """
            WITH current_period AS (
                SELECT aesthetic, metric_type, SUM(count) as total
                FROM trend_signals
                WHERE recorded_at > $1 AND recorded_at <= $2
                  AND metric_type IN ('likes', 'saves')
                  AND period = 'daily'
                GROUP BY aesthetic, metric_type
            ),
            previous_period AS (
                SELECT aesthetic, metric_type, SUM(count) as total
                FROM trend_signals
                WHERE recorded_at > $3 AND recorded_at <= $4
                  AND metric_type IN ('likes', 'saves')
                  AND period = 'daily'
                GROUP BY aesthetic, metric_type
            ),
            combined AS (
                SELECT 
                    c.aesthetic,
                    c.metric_type,
                    c.total as current_count,
                    COALESCE(p.total, 0) as previous_count,
                    CASE 
                        WHEN COALESCE(p.total, 0) = 0 THEN 
                            CASE WHEN c.total > 0 THEN 100.0 ELSE 0.0 END
                        ELSE ROUND(((c.total - p.total)::numeric / p.total) * 100, 1)
                    END as pct_change
                FROM current_period c
                LEFT JOIN previous_period p 
                    ON c.aesthetic = p.aesthetic AND c.metric_type = p.metric_type
            ),
            ranked AS (
                SELECT 
                    aesthetic,
                    SUM(current_count) as total_current,
                    SUM(previous_count) as total_previous,
                    ROUND(AVG(pct_change), 1) as avg_pct_change,
                    MAX(pct_change) as max_pct_change
                FROM combined
                GROUP BY aesthetic
                HAVING SUM(current_count) > 2
                ORDER BY avg_pct_change DESC
                LIMIT $5
            )
            SELECT 
                aesthetic,
                avg_pct_change as overall_percent_change,
                CASE 
                    WHEN max_pct_change = avg_pct_change THEN 'likes + saves'
                    ELSE 'likes + saves'
                END as top_metric,
                'this week' as period_label
            FROM ranked
            ORDER BY avg_pct_change DESC
            LIMIT $6
            """,
            seven_days_ago, today,
            fourteen_days_ago, seven_days_ago,
            limit + 2, limit,
        )

        return [
            TrendTeaserSchema(
                aesthetic=r["aesthetic"],
                overall_percent_change=float(r["overall_percent_change"]),
                top_metric=r["top_metric"],
                period_label=r["period_label"],
            )
            for r in rows
        ]

    async def get_all_trends(self) -> List[TrendPeriodSchema]:
        """Full trend data for all tracked aesthetics (auth required)."""
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        fourteen_days_ago = today - timedelta(days=14)

        aesthetics = await self.conn.fetch(
            """
            SELECT DISTINCT aesthetic 
            FROM trend_signals 
            WHERE recorded_at > $1 
            ORDER BY aesthetic
            """,
            fourteen_days_ago,
        )

        results = []
        for row in aesthetics:
            aesthetic = row["aesthetic"]
            trend = await self._build_trend_period(aesthetic, seven_days_ago, fourteen_days_ago, today, 7)
            results.append(trend)

        results.sort(key=lambda t: t.overall_percent_change, reverse=True)
        return results

    async def get_trend_detail(self, aesthetic: str) -> TrendPeriodSchema:
        """Detailed trend data for a specific aesthetic."""
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        fourteen_days_ago = today - timedelta(days=14)

        return await self._build_trend_period(aesthetic, seven_days_ago, fourteen_days_ago, today, 7)

    async def get_trend_trajectory(self, aesthetic: str, days: int = 7) -> TrendTrajectorySchema:
        """Get trajectory data for chart rendering (7/30/90 days)."""
        days = min(max(days, 7), 90)
        today = date.today()
        start_date = today - timedelta(days=days)
        prev_start_date = start_date - timedelta(days=days)

        metrics = []
        for metric_type in ["likes", "saves", "searches", "tags"]:
            current_points = await self._get_trajectory_points(aesthetic, metric_type, start_date, today)
            prev_points = await self._get_trajectory_points(aesthetic, metric_type, prev_start_date, start_date)

            current_total = sum(p.count for p in current_points)
            prev_total = sum(p.count for p in prev_points)

            pct_change = 0.0
            if prev_total > 0:
                pct_change = round(((current_total - prev_total) / prev_total) * 100, 1)
            elif current_total > 0:
                pct_change = 100.0

            metrics.append(
                TrendMetricSummary(
                    metric_type=metric_type,
                    current_count=current_total,
                    previous_count=prev_total,
                    percent_change=pct_change,
                    trajectory=current_points,
                )
            )

        return TrendTrajectorySchema(
            aesthetic=aesthetic,
            days=days,
            metrics=metrics,
        )

    async def _build_trend_period(
        self,
        aesthetic: str,
        start_date: date,
        prev_start_date: date,
        end_date: date,
        days: int,
    ) -> TrendPeriodSchema:
        metrics = []
        for metric_type in ["likes", "saves", "searches", "tags"]:
            current_points = await self._get_trajectory_points(aesthetic, metric_type, start_date, end_date)
            prev_points = await self._get_trajectory_points(aesthetic, metric_type, prev_start_date, start_date)

            current_total = sum(p.count for p in current_points)
            prev_total = sum(p.count for p in prev_points)

            pct_change = 0.0
            if prev_total > 0:
                pct_change = round(((current_total - prev_total) / prev_total) * 100, 1)
            elif current_total > 0:
                pct_change = 100.0

            metrics.append(
                TrendMetricSummary(
                    metric_type=metric_type,
                    current_count=current_total,
                    previous_count=prev_total,
                    percent_change=pct_change,
                    trajectory=current_points,
                )
            )

        # Overall change weighted towards likes and saves
        main_metrics = [m for m in metrics if m.metric_type in ("likes", "saves")]
        overall_change = 0.0
        if main_metrics:
            overall_change = round(sum(m.percent_change for m in main_metrics) / len(main_metrics), 1)

        return TrendPeriodSchema(
            aesthetic=aesthetic,
            metrics=metrics,
            overall_percent_change=overall_change,
            is_rising=overall_change > 0,
        )

    async def _get_trajectory_points(
        self, aesthetic: str, metric_type: str, start_date: date, end_date: date
    ) -> List[TrendTrajectoryPoint]:
        rows = await self.conn.fetch(
            """
            SELECT recorded_at as date, COALESCE(SUM(count), 0) as count
            FROM trend_signals
            WHERE aesthetic = $1 
              AND metric_type = $2 
              AND recorded_at >= $3 
              AND recorded_at <= $4
              AND period = 'daily'
            GROUP BY recorded_at
            ORDER BY recorded_at ASC
            """,
            aesthetic, metric_type, start_date, end_date,
        )
        return [TrendTrajectoryPoint(date=str(r["date"]), count=r["count"]) for r in rows]

    async def aggregate_trends(self, target_date: Optional[date] = None) -> TrendRefreshResponse:
        """Aggregate signals for a given date. Called by daily cron."""
        if target_date is None:
            target_date = date.today() - timedelta(days=1)

        signals_created = 0

        # 1. SAVES: Sets created (published) with each aesthetic tag
        saves = await self.conn.fetch(
            """
            SELECT unnest(aesthetic_tags) as aesthetic, COUNT(*) as count
            FROM sets
            WHERE DATE(published_at) = $1 
              AND is_published = TRUE 
              AND deleted_at IS NULL
              AND aesthetic_tags <> '{}'
            GROUP BY aesthetic
            """,
            target_date,
        )
        for row in saves:
            signals_created += await self._upsert_signal(
                row["aesthetic"], "saves", row["count"], target_date
            )

        # 2. LIKES: Likes on sets grouped by aesthetic
        likes = await self.conn.fetch(
            """
            SELECT unnest(s.aesthetic_tags) as aesthetic, COUNT(*) as count
            FROM set_likes sl
            JOIN sets s ON s.id = sl.set_id
            WHERE DATE(sl.created_at) = $1 
              AND s.deleted_at IS NULL
              AND s.aesthetic_tags <> '{}'
            GROUP BY aesthetic
            """,
            target_date,
        )
        for row in likes:
            signals_created += await self._upsert_signal(
                row["aesthetic"], "likes", row["count"], target_date
            )

        # 3. SEARCHES: Inferred from affiliate clicks on sets
        searches = await self.conn.fetch(
            """
            SELECT unnest(s.aesthetic_tags) as aesthetic, COUNT(*) as count
            FROM affiliate_clicks ac
            JOIN sets s ON s.id = ac.set_id
            WHERE DATE(ac.click_ts) = $1 
              AND s.deleted_at IS NULL
              AND s.aesthetic_tags <> '{}'
            GROUP BY aesthetic
            """,
            target_date,
        )
        for row in searches:
            signals_created += await self._upsert_signal(
                row["aesthetic"], "searches", row["count"], target_date
            )

        # 4. TAGS: Total tag applications (sets created)
        tags = await self.conn.fetch(
            """
            SELECT unnest(aesthetic_tags) as aesthetic, COUNT(*) as count
            FROM sets
            WHERE DATE(created_at) = $1 
              AND deleted_at IS NULL
              AND aesthetic_tags <> '{}'
            GROUP BY aesthetic
            """,
            target_date,
        )
        for row in tags:
            signals_created += await self._upsert_signal(
                row["aesthetic"], "tags", row["count"], target_date
            )

        logger.info(
            "Trends aggregated",
            date=str(target_date),
            signals_created=signals_created,
        )

        return TrendRefreshResponse(
            message="Trends aggregated successfully",
            signals_created=signals_created,
            date_processed=str(target_date),
        )

    async def _upsert_signal(
        self, aesthetic: str, metric_type: str, count: int, recorded_at: date
    ) -> int:
        result = await self.conn.execute(
            """
            INSERT INTO trend_signals (aesthetic, metric_type, count, recorded_at, period)
            VALUES ($1, $2, $3, $4, 'daily')
            ON CONFLICT (aesthetic, metric_type, recorded_at, period) 
            DO UPDATE SET count = $3, created_at = NOW()
            """,
            aesthetic, metric_type, count, recorded_at,
        )
        return 1