"""Trends Domain — Routes"""

from fastapi import APIRouter, Depends, Query, HTTPException
from asyncpg import Connection
from typing import Optional

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user, get_optional_user
from domains.trends.schemas import (
    TrendTeaserSchema,
    TrendPeriodSchema,
    TrendTrajectorySchema,
    TrendRefreshResponse,
)
from domains.trends.service import TrendsService

router = APIRouter()


@router.get("", response_model=list[TrendTeaserSchema])
async def get_trends_teaser(
    conn: Connection = Depends(get_conn),
):
    """Public teaser: top 3 rising trends for homepage."""
    service = TrendsService(conn)
    return await service.get_trending_teasers(limit=3)


@router.get("/all", response_model=list[TrendPeriodSchema])
async def get_all_trends(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Full trend list — auth required."""
    service = TrendsService(conn)
    return await service.get_all_trends()


@router.get("/trajectory/{aesthetic}", response_model=TrendTrajectorySchema)
async def get_trend_trajectory(
    aesthetic: str,
    days: int = Query(7, ge=7, le=90),
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Trajectory graph data — auth required."""
    service = TrendsService(conn)
    return await service.get_trend_trajectory(aesthetic, days)


@router.get("/{aesthetic}", response_model=TrendPeriodSchema)
async def get_trend_detail(
    aesthetic: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Detailed trend for a specific aesthetic — auth required."""
    service = TrendsService(conn)
    return await service.get_trend_detail(aesthetic)


@router.post("/refresh", response_model=TrendRefreshResponse)
async def refresh_trends(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Trigger trend aggregation. Auth required (admin/internal use)."""
    # In production, restrict this to admin users
    service = TrendsService(conn)
    return await service.aggregate_trends()