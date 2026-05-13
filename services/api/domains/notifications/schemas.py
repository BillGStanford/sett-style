"""Notifications Domain — Schemas"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationActorSchema(BaseModel):
    id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None


class NotificationSchema(BaseModel):
    id: str
    type: str
    actor: Optional[NotificationActorSchema] = None
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    message: str
    is_read: bool
    created_at: datetime


class NotificationListSchema(BaseModel):
    notifications: list[NotificationSchema]
    unread_count: int
    has_more: bool


class MarkReadRequest(BaseModel):
    notification_ids: Optional[list[str]] = None
    mark_all: bool = False


class MarkReadResponse(BaseModel):
    status: str
    marked_count: int