"""Trends Domain — Pydantic Schemas"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID


class TrendSignalSchema(BaseModel):
    id: UUID
    aesthetic: str
    metric_type: str
    count: int
    recorded_at: date
    period: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TrendTrajectoryPoint(BaseModel):
    date: str
    count: int


class TrendMetricSummary(BaseModel):
    metric_type: str
    current_count: int
    previous_count: int
    percent_change: float
    trajectory: List[TrendTrajectoryPoint]


class TrendPeriodSchema(BaseModel):
    """Aggregated trend data for a single aesthetic."""
    aesthetic: str
    metrics: List[TrendMetricSummary]
    overall_percent_change: float
    is_rising: bool


class TrendTrajectorySchema(BaseModel):
    """Full trajectory data for chart rendering."""
    aesthetic: str
    days: int
    metrics: List[TrendMetricSummary]


class TrendTeaserSchema(BaseModel):
    """Public teaser card for homepage."""
    aesthetic: str
    overall_percent_change: float
    top_metric: str
    period_label: str


class TrendRefreshResponse(BaseModel):
    message: str
    signals_created: int
    date_processed: str