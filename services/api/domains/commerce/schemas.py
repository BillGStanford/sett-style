"""Commerce Domain — Pydantic Schemas"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClickResponseSchema(BaseModel):
    id: str
    item_id: str
    set_id: Optional[str]
    click_ts: datetime
    converted: bool


class EarningsTopSet(BaseModel):
    set_id: str
    title: str
    clicks: int
    revenue: float


class CreatorEarningsSchema(BaseModel):
    wallet_balance: float
    pending_balance: float
    total_earned: float
    this_week: float
    total_clicks: int
    total_conversions: int
    conversion_rate: float
    top_set: Optional[EarningsTopSet]
    payout_minimum: float
    can_request_payout: bool
