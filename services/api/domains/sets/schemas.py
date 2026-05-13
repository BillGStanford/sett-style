"""Sets Domain — Pydantic Schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID

class SetCreateSchema(BaseModel):
    title: str
    canvas_json: dict
    thumbnail_url: Optional[str] = None
    aesthetic_tags: List[str] = []
    privacy: str = "public"
    is_published: bool = False

class SetUpdateSchema(BaseModel):
    title: Optional[str] = None
    canvas_json: Optional[dict] = None
    thumbnail_url: Optional[str] = None
    aesthetic_tags: Optional[List[str]] = None
    privacy: Optional[str] = None
    is_published: Optional[bool] = None
    allow_remixes: Optional[bool] = None  # NEW

class SetPrivacyUpdateSchema(BaseModel):
    privacy: str  # "public" or "private"

class RemixCreateSchema(BaseModel):
    """Request to create a remix of an existing set."""
    title: Optional[str] = None  # Auto-generated if not provided
    keep_tags: bool = True  # Copy aesthetic tags from original

class RemixResponseSchema(BaseModel):
    """Response after creating a remix."""
    new_set_id: UUID
    original_set_id: UUID
    revenue_share_pct: float = 10.00
    share_expiry_date: datetime
    attribution_url: str  # URL to original set

class SetPermissionsSchema(BaseModel):
    """Permission flags for a set, given a viewer."""
    can_edit: bool  # User owns this set
    can_remix: bool  # Set is public + allows remixes + user is logged in
    can_view: bool  # Set is public or user owns it
    allow_remixes: bool  # Creator's preference
    is_owner: bool
    is_published: bool
    privacy: str

class CreatorMiniSchema(BaseModel):
    id: UUID
    username: Optional[str]
    avatar_url: Optional[str]
    model_config = {"from_attributes": True}

class SetResponseSchema(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    slug: Optional[str]
    canvas_json: dict
    thumbnail_url: Optional[str]
    aesthetic_tags: List[str]
    privacy: str
    is_published: bool
    like_count: int
    view_count: int
    creator: Optional[CreatorMiniSchema] = None
    remix_of_id: Optional[UUID] = None
    parent_set_id: Optional[UUID] = None  # NEW: for edit chain
    allow_remixes: bool = True  # NEW
    edited_at: Optional[datetime] = None  # NEW
    created_at: datetime
    updated_at: datetime
    # Viewer context
    is_liked: bool = False
    is_following_creator: bool = False
    is_owner: bool = False
    permissions: Optional[SetPermissionsSchema] = None  # NEW: computed field
    model_config = {"from_attributes": True}

class SetFeedSchema(BaseModel):
    """Lighter schema for feed cards — no canvas_json."""
    id: UUID
    title: str
    slug: Optional[str]
    thumbnail_url: Optional[str]
    aesthetic_tags: List[str]
    like_count: int
    view_count: int
    creator: Optional[CreatorMiniSchema] = None
    created_at: datetime
    remix_of_id: Optional[UUID] = None  # NEW: show in feed if remix
    parent_set_id: Optional[UUID] = None  # NEW
    # Viewer context
    is_liked: bool = False
    is_followed_creator: bool = False
    # Ranking context
    section: Optional[str] = "algorithmic"
    relevance_score: float = 0.0
    model_config = {"from_attributes": True}

class LikeToggleResponse(BaseModel):
    """Response from POST /sets/{id}/like"""
    liked: bool
    like_count: int