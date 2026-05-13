"""
Referrals Domain — Schemas
"""

from pydantic import BaseModel
from typing import Optional


class ReferralCodeResponse(BaseModel):
    code: str
    share_url: str
    direct_url: str
    total_referred: int
    referred_this_month: int
    bonus_pct: int
    window_days: int


class ReferralStatsResponse(BaseModel):
    total_referred: int
    referred_this_week: int
    referred_this_month: int
    active_referred_users: int
    total_bonus_earned: float
    bonus_this_month: float
    bonus_rate: int
    attribution_window_days: int


class ReferredUserItem(BaseModel):
    id: str
    username: Optional[str]
    avatar_url: Optional[str]
    joined_at: str
    sets_published: int
    total_earned: float


class ReferredUsersResponse(BaseModel):
    users: list[ReferredUserItem]
    total: int
    limit: int
    offset: int


class ApplyReferralResponse(BaseModel):
    status: str
    bonus_active_days: int