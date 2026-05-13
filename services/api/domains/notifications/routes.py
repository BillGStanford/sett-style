"""Notifications Domain — Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query
from asyncpg import Connection

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user
from domains.notifications.schemas import (
    NotificationListSchema,
    MarkReadRequest,
    MarkReadResponse,
)
from domains.notifications.service import NotificationsService

router = APIRouter()


@router.get("", response_model=NotificationListSchema)
async def get_notifications(
    limit: int = Query(20, le=50, ge=1),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Get notifications for the current user."""
    service = NotificationsService(conn)
    return await service.get_notifications(
        user_id=current_user["id"],
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )


@router.get("/unread-count")
async def get_unread_count(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Get unread notification count (lightweight for polling)."""
    service = NotificationsService(conn)
    count = await service.get_unread_count(current_user["id"])
    return {"count": count}


@router.post("/mark-read", response_model=MarkReadResponse)
async def mark_as_read(
    body: MarkReadRequest,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Mark notifications as read."""
    if not body.notification_ids and not body.mark_all:
        raise HTTPException(
            status_code=400,
            detail="Provide notification_ids or set mark_all to true",
        )

    service = NotificationsService(conn)
    count = await service.mark_as_read(
        user_id=current_user["id"],
        notification_ids=body.notification_ids,
        mark_all=body.mark_all,
    )
    return MarkReadResponse(status="ok", marked_count=count)


@router.post("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_single_read(
    notification_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Mark a single notification as read (e.g., when clicking on it)."""
    service = NotificationsService(conn)
    success = await service.mark_single_as_read(current_user["id"], notification_id)
    return MarkReadResponse(status="ok", marked_count=1 if success else 0)