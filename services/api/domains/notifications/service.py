"""Notifications Domain — Service Layer"""

import asyncpg
from typing import Optional
from datetime import datetime, timezone

from core.logging.logger import get_logger

logger = get_logger(__name__)


class NotificationsService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_notification(
        self,
        user_id: str,
        type: str,
        actor_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        message: Optional[str] = None,
    ) -> str:
        """Create a notification. Returns the notification ID."""
        if not message:
            message = self._generate_message(type, actor_id)

        row = await self.conn.fetchrow(
            """
            INSERT INTO notifications (user_id, type, actor_id, entity_id, entity_type, message)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            user_id, type, actor_id, entity_id, entity_type, message,
        )
        return str(row["id"]) if row else None

    async def get_notifications(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
    ) -> dict:
        """Get notifications with actor details and unread count."""
        conditions = ["n.user_id = $1"]
        params: list = [user_id]

        if unread_only:
            conditions.append("n.is_read = FALSE")

        where = " AND ".join(conditions)

        params.append(limit)
        limit_idx = len(params)
        params.append(offset)
        offset_idx = len(params)

        rows = await self.conn.fetch(
            f"""
            SELECT n.id, n.type, n.actor_id, n.entity_id, n.entity_type,
                   n.message, n.is_read, n.created_at,
                   a.username AS actor_username,
                   a.avatar_url AS actor_avatar_url
            FROM notifications n
            LEFT JOIN users a ON a.id = n.actor_id AND a.deleted_at IS NULL
            WHERE {where}
            ORDER BY n.created_at DESC
            LIMIT ${limit_idx} OFFSET ${offset_idx}
            """,
            *params,
        )

        unread_count = await self.conn.fetchval(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
            user_id,
        )

        total_count = await self.conn.fetchval(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1",
            user_id,
        )

        notifications = []
        for r in rows:
            actor = None
            if r["actor_id"]:
                actor = {
                    "id": str(r["actor_id"]),
                    "username": r["actor_username"],
                    "avatar_url": r["actor_avatar_url"],
                }
            notifications.append({
                "id": str(r["id"]),
                "type": r["type"],
                "actor": actor,
                "entity_id": str(r["entity_id"]) if r["entity_id"] else None,
                "entity_type": r["entity_type"],
                "message": r["message"],
                "is_read": r["is_read"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })

        return {
            "notifications": notifications,
            "unread_count": unread_count or 0,
            "has_more": (offset + limit) < (total_count or 0),
        }

    async def get_unread_count(self, user_id: str) -> int:
        """Get just the unread count (lightweight endpoint for polling)."""
        count = await self.conn.fetchval(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
            user_id,
        )
        return count or 0

    async def mark_as_read(
        self,
        user_id: str,
        notification_ids: Optional[list[str]] = None,
        mark_all: bool = False,
    ) -> int:
        """Mark notifications as read. Returns count of marked notifications."""
        if mark_all:
            result = await self.conn.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
                user_id,
            )
            # parse "UPDATE N" result
            count = int(result.split()[-1]) if result else 0
            return count

        if notification_ids:
            result = await self.conn.execute(
                """
                UPDATE notifications SET is_read = TRUE
                WHERE user_id = $1 AND id = ANY($2::uuid[]) AND is_read = FALSE
                """,
                user_id, notification_ids,
            )
            count = int(result.split()[-1]) if result else 0
            return count

        return 0

    async def mark_single_as_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a single notification as read."""
        result = await self.conn.execute(
            """
            UPDATE notifications SET is_read = TRUE
            WHERE user_id = $1 AND id = $2 AND is_read = FALSE
            """,
            user_id, notification_id,
        )
        return "UPDATE 1" in result

    def _generate_message(self, type: str, actor_id: Optional[str] = None) -> str:
        """Generate default message for notification type."""
        messages = {
            "follow": "started following you",
            "like": "liked your set",
            "remix": "remixed your set",
            "earnings": "You earned a commission",
            "payout": "Your payout was processed",
            "milestone": "You reached a new milestone!",
        }
        return messages.get(type, "New notification")