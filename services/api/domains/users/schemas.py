"""
Users Domain — Schemas
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class UserCreateSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    referral_code: Optional[str] = Field(default=None, max_length=20)


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str


class OnboardingStepSchema(BaseModel):
    """Update onboarding progress - called on each step transition."""
    step: int = Field(ge=1, le=4)


class OnboardingSchema(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    style_prefs: list[str] = Field(default_factory=list, max_length=10)
    goal: Optional[str] = Field(default=None, pattern=r"^(browse|create|earn)$")
    # Location (optional, shown publicly)
    location: Optional[str] = Field(default=None, max_length=100)
    # Optional demographic fields (opt-in, NOT shown publicly)
    age_range: Optional[Literal['18-24', '25-34', '35-44', '45-54', '55+']] = None
    gender_identity: Optional[str] = Field(default=None, max_length=100)
    discovery_source: Optional[Literal['reddit', 'tiktok', 'friend', 'instagram', 'pinterest', 'search', 'other']] = None


class UserUpdateSchema(BaseModel):
    bio: Optional[str] = Field(default=None, max_length=200)
    avatar_url: Optional[str] = None
    show_followers: Optional[bool] = None
    # Location (optional, shown publicly)
    location: Optional[str] = Field(default=None, max_length=100)
    # Demographic fields (can be updated in settings, NOT shown publicly)
    age_range: Optional[Literal['18-24', '25-34', '35-44', '45-54', '55+', '']] = None
    gender_identity: Optional[str] = Field(default=None, max_length=100)
    discovery_source: Optional[Literal['reddit', 'tiktok', 'friend', 'instagram', 'pinterest', 'search', 'other', '']] = None


class UserProfileSchema(BaseModel):
    id: str
    email: str
    username: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    goal: Optional[str]
    style_prefs: list[str]
    plan: str
    wallet_balance: float
    total_earned: float
    is_email_verified: bool
    user_tier: str
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None
    is_following: bool = False
    followers_count: int = 0
    following_count: int = 0
    sets_count: int = 0
    total_likes: int = 0
    show_followers: bool = True
    # Location (shown publicly)
    location: Optional[str] = None
    # Demographic fields (not exposed publicly, only to self)
    age_range: Optional[str] = None
    gender_identity: Optional[str] = None
    discovery_source: Optional[str] = None
    # Onboarding tracking (only visible to self)
    onboarding_step: Optional[int] = None
    onboarding_completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponseSchema(BaseModel):
    access_token: str
    user: UserProfileSchema