"""Sets Domain — Service Layer"""

import asyncpg
import json
from typing import Optional
from slugify import slugify
from nanoid import generate as nanoid
from datetime import datetime, timedelta, timezone

from domains.sets.schemas import SetCreateSchema, SetUpdateSchema
from core.logging.logger import get_logger

logger = get_logger(__name__)


class SetsService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def _create_notification(
        self,
        user_id: str,
        type: str,
        actor_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        message: Optional[str] = None,
    ):
        """Helper to create notification (non-blocking, doesn't fail on error)."""
        try:
            if not message:
                messages = {
                    "follow": "started following you",
                    "like": "liked your set",
                    "remix": "remixed your set",
                    "new_set": "published a new set",
                }
                message = messages.get(type, "New notification")

            await self.conn.execute(
                """
                INSERT INTO notifications (user_id, type, actor_id, entity_id, entity_type, message)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                user_id, type, actor_id, entity_id, entity_type, message,
            )
        except Exception as e:
            logger.debug(f"Notification creation failed (non-blocking): {e}")

    async def _notify_followers_of_new_set(
        self,
        creator_id: str,
        set_id: str,
    ):
        """Notify all followers when a user publishes a new set. Single bulk query."""
        try:
            await self.conn.execute(
                """
                INSERT INTO notifications (user_id, type, actor_id, entity_id, entity_type, message)
                SELECT
                    f.follower_id,
                    'new_set',
                    $1,
                    $2,
                    'set',
                    'published a new set'
                FROM follows f
                WHERE f.following_id = $1
                ON CONFLICT DO NOTHING
                """,
                creator_id,
                set_id,
            )
        except Exception as e:
            logger.debug(f"Followers notification failed (non-blocking): {e}")

    async def create_set(self, user_id: str, data: SetCreateSchema) -> dict:
        slug = slugify(data.title)[:80] + "-" + nanoid(size=6)
        row = await self.conn.fetchrow(
            """
            INSERT INTO sets (user_id, title, slug, canvas_json, thumbnail_url,
                              aesthetic_tags, privacy, is_published, published_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
            """,
            user_id, data.title, slug,
            json.dumps(data.canvas_json) if data.canvas_json else '{}',
            data.thumbnail_url,
            data.aesthetic_tags or [],
            data.privacy,
            data.is_published,
            datetime.now(timezone.utc) if data.is_published else None,
        )
        result = dict(row)
        if isinstance(result.get("canvas_json"), str):
            result["canvas_json"] = json.loads(result["canvas_json"])
        result["creator"] = None
        result["is_liked"] = False
        result["is_following_creator"] = False
        logger.info("Set created", set_id=result["id"], user_id=user_id)

        # Notify followers when publishing (not for drafts)
        if data.is_published:
            await self._notify_followers_of_new_set(
                creator_id=user_id,
                set_id=str(result["id"]),
            )

        return result

    async def get_set(self, set_id: str, viewer_id: Optional[str] = None, session_id: Optional[str] = None) -> Optional[dict]:
        row = await self.conn.fetchrow(
            """
            SELECT s.*,
                   u.username AS creator_username,
                   u.avatar_url AS creator_avatar_url,
                   u.id AS creator_user_id
            FROM sets s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = $1 AND s.deleted_at IS NULL
            """,
            set_id,
        )
        if not row:
            return None

        # Only increment view count once per session per day using set_views table
        if session_id:
            try:
                inserted = await self.conn.fetchval(
                    """
                    INSERT INTO set_views (set_id, viewer_id, session_id, viewed_date)
                    VALUES ($1, $2, $3, CURRENT_DATE)
                    ON CONFLICT (set_id, session_id, viewed_date) DO NOTHING
                    RETURNING id
                    """,
                    set_id, viewer_id, session_id
                )
                if inserted:
                    await self.conn.execute(
                        "UPDATE sets SET view_count = view_count + 1 WHERE id = $1", set_id
                    )
            except Exception as e:
                logger.debug(f"View tracking skipped: {e}")

        result = dict(row)
        creator_id = result.pop("creator_user_id")
        result["creator"] = {
            "id": str(creator_id),
            "username": result.pop("creator_username"),
            "avatar_url": result.pop("creator_avatar_url"),
        }
        if isinstance(result.get("canvas_json"), str):
            result["canvas_json"] = json.loads(result["canvas_json"])

        is_liked = False
        is_following_creator = False
        is_owner = False
        if viewer_id:
            context = await self.conn.fetchrow(
                """
                SELECT
                    EXISTS(SELECT 1 FROM set_likes WHERE user_id = $1 AND set_id = $2) AS liked,
                    EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $3) AS following
                """,
                viewer_id, set_id, creator_id
            )
            is_liked = context["liked"] if context else False
            is_following_creator = context["following"] if context else False
            is_owner = str(creator_id) == viewer_id

        result["is_liked"] = is_liked
        result["is_following_creator"] = is_following_creator
        result["is_owner"] = is_owner

        return result


    async def get_private_sets(self, user_id: str) -> list[dict]:
        """Get sets that are published but marked private."""
        rows = await self.conn.fetch(
            """
            SELECT s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                   s.privacy, s.is_published, s.like_count, s.view_count,
                   s.created_at, s.updated_at
            FROM sets s
            WHERE s.user_id = $1
              AND s.deleted_at IS NULL
              AND s.is_published = TRUE
              AND s.privacy = 'private'
            ORDER BY s.updated_at DESC
            """,
            user_id,
        )
        return [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "slug": r["slug"],
                "thumbnail_url": r["thumbnail_url"],
                "aesthetic_tags": r["aesthetic_tags"] or [],
                "privacy": r["privacy"],
                "is_published": r["is_published"],
                "like_count": r["like_count"],
                "view_count": r["view_count"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in rows
        ]

    async def get_draft_sets(self, user_id: str) -> list[dict]:
        """Get sets that are not published (drafts)."""
        rows = await self.conn.fetch(
            """
            SELECT s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                   s.privacy, s.is_published, s.like_count, s.view_count,
                   s.created_at, s.updated_at
            FROM sets s
            WHERE s.user_id = $1
              AND s.deleted_at IS NULL
              AND s.is_published = FALSE
            ORDER BY s.updated_at DESC
            """,
            user_id,
        )
        return [
            {
                "id": str(r["id"]),
                "title": r["title"],
                "slug": r["slug"],
                "thumbnail_url": r["thumbnail_url"],
                "aesthetic_tags": r["aesthetic_tags"] or [],
                "privacy": r["privacy"],
                "is_published": r["is_published"],
                "like_count": r["like_count"],
                "view_count": r["view_count"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in rows
        ]

    async def toggle_privacy(self, set_id: str, user_id: str, privacy: str) -> Optional[dict]:
        """Toggle set privacy between 'public' and 'private'."""
        if privacy not in ("public", "private"):
            return None

        row = await self.conn.fetchrow(
            """
            UPDATE sets
            SET privacy = $3, updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING id, title, slug, thumbnail_url, privacy, is_published,
                      updated_at
            """,
            set_id, user_id, privacy,
        )
        if not row:
            return None

        logger.info("Set privacy toggled", set_id=set_id, user_id=user_id, privacy=privacy)

        return {
            "id": str(row["id"]),
            "title": row["title"],
            "slug": row["slug"],
            "thumbnail_url": row["thumbnail_url"],
            "privacy": row["privacy"],
            "is_published": row["is_published"],
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }

    async def get_feed(
        self,
        viewer_id: Optional[str],
        offset: int,
        aesthetic: Optional[str],
        user_id: Optional[str],
        limit: int,
        following: bool = False,
    ) -> list[dict]:
        # 1. If filtering by a specific user (e.g. profile page), bypass everything else
        if user_id:
            return await self._get_user_feed(user_id, viewer_id, offset, aesthetic, limit)

        # 2. If following filter is explicitly requested, only show followed users' sets
        if following and viewer_id:
            return await self._get_following_feed(viewer_id, offset, aesthetic, limit)

        # 3. If no viewer, just return trending feed
        if not viewer_id:
            return await self._get_trending_feed(None, offset, aesthetic, limit)

        # 4. Logged-in user: show followed users' sets first, then personalized + trending
        followed_sets = await self._get_following_feed(viewer_id, offset, aesthetic, limit)

        if len(followed_sets) == limit:
            return followed_sets

        remaining_limit = limit - len(followed_sets)
        algorithmic_sets = await self._get_algorithmic_feed(viewer_id, offset, aesthetic, remaining_limit)

        return followed_sets + algorithmic_sets

    async def _get_user_feed(
        self,
        target_user_id: str,
        viewer_id: Optional[str],
        offset: int,
        aesthetic: Optional[str],
        limit: int,
    ) -> list[dict]:
        params: list = []
        conditions = [
            "s.is_published = TRUE",
            "s.deleted_at IS NULL",
            "s.privacy = 'public'",
            "s.user_id = $1"
        ]
        params.append(target_user_id)

        if aesthetic and aesthetic != "All":
            params.append(aesthetic)
            conditions.append(f"${len(params)} = ANY(s.aesthetic_tags)")

        where = " AND ".join(conditions)

        viewer_sub = "FALSE"
        if viewer_id:
            params.append(viewer_id)
            viewer_idx = len(params)
            viewer_sub = f"EXISTS(SELECT 1 FROM follows WHERE follower_id = ${viewer_idx} AND following_id = s.user_id)"

        params.append(limit)
        limit_idx = len(params)
        params.append(offset)
        offset_idx = len(params)

        rows = await self.conn.fetch(
            f"""
            SELECT s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                   s.like_count, s.view_count, s.published_at AS created_at,
                   u.username AS creator_username,
                   u.avatar_url AS creator_avatar_url,
                   u.id AS creator_id,
                   COALESCE({viewer_sub}, FALSE) AS _is_followed,
                   'algorithmic' AS _section,
                   0 AS relevance_score
            FROM sets s
            JOIN users u ON u.id = s.user_id
            WHERE {where}
            ORDER BY s.published_at DESC
            LIMIT ${limit_idx} OFFSET ${offset_idx}
            """,
            *params,
        )

        liked_set_ids: set = set()
        if viewer_id and rows:
            set_ids = [str(r["id"]) for r in rows]
            liked_rows = await self.conn.fetch(
                "SELECT set_id FROM set_likes WHERE user_id = $1 AND set_id = ANY($2::uuid[])",
                viewer_id, set_ids,
            )
            liked_set_ids = {str(r["set_id"]) for r in liked_rows}

        return [self._format_feed_row(r, liked_set_ids) for r in rows]

    async def _get_following_feed(
        self,
        viewer_id: str,
        offset: int,
        aesthetic: Optional[str],
        limit: int,
    ) -> list[dict]:
        params: list = []
        conditions = [
            "s.is_published = TRUE",
            "s.deleted_at IS NULL",
            "s.privacy = 'public'",
            "EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = s.user_id)"
        ]
        params.append(viewer_id)

        if aesthetic and aesthetic != "All":
            params.append(aesthetic)
            conditions.append(f"${len(params)} = ANY(s.aesthetic_tags)")

        where = " AND ".join(conditions)

        params.append(limit)
        limit_idx = len(params)
        params.append(offset)
        offset_idx = len(params)

        rows = await self.conn.fetch(
            f"""
            SELECT s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                   s.like_count, s.view_count, s.published_at AS created_at,
                   u.username AS creator_username,
                   u.avatar_url AS creator_avatar_url,
                   u.id AS creator_id,
                   TRUE AS _is_followed,
                   'following' AS _section,
                   0 AS relevance_score
            FROM sets s
            JOIN users u ON u.id = s.user_id
            WHERE {where}
            ORDER BY s.published_at DESC
            LIMIT ${limit_idx} OFFSET ${offset_idx}
            """,
            *params,
        )

        liked_set_ids: set = set()
        if rows:
            set_ids = [str(r["id"]) for r in rows]
            liked_rows = await self.conn.fetch(
                "SELECT set_id FROM set_likes WHERE user_id = $1 AND set_id = ANY($2::uuid[])",
                viewer_id, set_ids,
            )
            liked_set_ids = {str(r["set_id"]) for r in liked_rows}

        return [self._format_feed_row(r, liked_set_ids) for r in rows]

    async def _get_algorithmic_feed(
        self,
        viewer_id: Optional[str],
        offset: int,
        aesthetic: Optional[str],
        limit: int,
    ) -> list[dict]:
        # 1. Try to get personalized sets based on user preferences
        if viewer_id:
            personalized = await self._get_personalized_feed(viewer_id, offset, aesthetic, limit)
            if len(personalized) == limit:
                return personalized

            # 2. Fill the rest with trending, excluding already fetched personalized sets
            personalized_ids = [s["id"] for s in personalized]
            remaining_limit = limit - len(personalized)
            trending = await self._get_trending_feed(viewer_id, offset, aesthetic, remaining_limit, exclude_ids=personalized_ids)
            return personalized + trending

        # No viewer, just trending
        return await self._get_trending_feed(None, offset, aesthetic, limit)

    async def _get_personalized_feed(
        self,
        viewer_id: str,
        offset: int,
        aesthetic: Optional[str],
        limit: int,
    ) -> list[dict]:
        """Fetch sets ranked by similarity to items the user has liked."""
        params: list = [viewer_id]
        conditions = [
            "s.is_published = TRUE",
            "s.deleted_at IS NULL",
            "s.privacy = 'public'",
            "NOT EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = s.user_id)"
        ]

        if aesthetic and aesthetic != "All":
            params.append(aesthetic)
            conditions.append(f"${len(params)} = ANY(s.aesthetic_tags)")

        where = " AND ".join(conditions)

        params.append(limit)
        limit_idx = len(params)
        params.append(offset)
        offset_idx = len(params)

        rows = await self.conn.fetch(
            f"""
            SELECT
                s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                s.like_count, s.view_count, s.published_at AS created_at,
                u.username AS creator_username,
                u.avatar_url AS creator_avatar_url,
                u.id AS creator_id,
                FALSE AS _is_followed,
                'algorithmic' AS _section,
                COALESCE(
                    SUM(
                        CASE
                            WHEN i.original_url IS NOT NULL AND i.original_url = i_pref.original_url THEN 1.0
                            WHEN i.brand IS NOT NULL AND i.brand = i_pref.brand THEN 0.5
                            WHEN i.category IS NOT NULL AND i.category = i_pref.category THEN 0.2
                            ELSE 0
                        END *
                        GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (NOW() - up.last_interacted_at)) / (14 * 86400)) *
                        up.score
                    ),
                    0
                ) AS relevance_score
            FROM sets s
            JOIN users u ON u.id = s.user_id
            JOIN set_items si ON si.set_id = s.id
            JOIN items i ON i.id = si.item_id
            JOIN user_preferences up ON up.user_id = $1
            JOIN items i_pref ON i_pref.id = up.item_id AND (
                (i.original_url IS NOT NULL AND i.original_url = i_pref.original_url) OR
                (i.brand IS NOT NULL AND i.brand = i_pref.brand) OR
                (i.category IS NOT NULL AND i.category = i_pref.category)
            )
            WHERE {where}
            GROUP BY s.id, u.id
            ORDER BY relevance_score DESC, s.like_count DESC
            LIMIT ${limit_idx} OFFSET ${offset_idx}
            """,
            *params,
        )

        liked_set_ids: set = set()
        if rows:
            set_ids = [str(r["id"]) for r in rows]
            liked_rows = await self.conn.fetch(
                "SELECT set_id FROM set_likes WHERE user_id = $1 AND set_id = ANY($2::uuid[])",
                viewer_id, set_ids,
            )
            liked_set_ids = {str(r["set_id"]) for r in liked_rows}

        return [self._format_feed_row(r, liked_set_ids) for r in rows]

    async def _get_trending_feed(
        self,
        viewer_id: Optional[str],
        offset: int,
        aesthetic: Optional[str],
        limit: int,
        exclude_ids: Optional[list[str]] = None,
    ) -> list[dict]:
        """Fetch general trending sets, optionally excluding specific IDs."""
        params: list = []
        conditions = [
            "s.is_published = TRUE",
            "s.deleted_at IS NULL",
            "s.privacy = 'public'",
        ]

        if aesthetic and aesthetic != "All":
            params.append(aesthetic)
            conditions.append(f"${len(params)} = ANY(s.aesthetic_tags)")

        if viewer_id:
            params.append(viewer_id)
            conditions.append(f"NOT EXISTS(SELECT 1 FROM follows WHERE follower_id = ${len(params)} AND following_id = s.user_id)")

        if exclude_ids:
            params.append(exclude_ids)
            conditions.append(f"s.id != ALL(${len(params)}::uuid[])")

        where = " AND ".join(conditions)

        params.append(limit)
        limit_idx = len(params)
        params.append(offset)
        offset_idx = len(params)

        rows = await self.conn.fetch(
            f"""
            SELECT s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                   s.like_count, s.view_count, s.published_at AS created_at,
                   u.username AS creator_username,
                   u.avatar_url AS creator_avatar_url,
                   u.id AS creator_id,
                   FALSE AS _is_followed,
                   'algorithmic' AS _section,
                   0 AS relevance_score
            FROM sets s
            JOIN users u ON u.id = s.user_id
            WHERE {where}
            ORDER BY s.like_count DESC, s.published_at DESC
            LIMIT ${limit_idx} OFFSET ${offset_idx}
            """,
            *params,
        )

        liked_set_ids: set = set()
        if viewer_id and rows:
            set_ids = [str(r["id"]) for r in rows]
            liked_rows = await self.conn.fetch(
                "SELECT set_id FROM set_likes WHERE user_id = $1 AND set_id = ANY($2::uuid[])",
                viewer_id, set_ids,
            )
            liked_set_ids = {str(r["set_id"]) for r in liked_rows}

        return [self._format_feed_row(r, liked_set_ids) for r in rows]

    async def get_featured(self, limit: int) -> list[dict]:
        rows = await self.conn.fetch(
            """
            SELECT s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                   s.like_count, s.view_count, s.published_at AS created_at,
                   u.username AS creator_username,
                   u.avatar_url AS creator_avatar_url,
                   u.id AS creator_id
            FROM sets s
            JOIN users u ON u.id = s.user_id
            WHERE s.is_published = TRUE AND s.deleted_at IS NULL AND s.privacy = 'public'
            ORDER BY s.like_count DESC, s.view_count DESC
            LIMIT $1
            """,
            limit,
        )
        return [self._format_feed_row(r) for r in rows]

    async def get_related(self, set_id: str, limit: int) -> list[dict]:
        source = await self.conn.fetchrow(
            "SELECT aesthetic_tags FROM sets WHERE id = $1", set_id
        )
        if not source or not source["aesthetic_tags"]:
            return await self.get_featured(limit)

        rows = await self.conn.fetch(
            """
            SELECT s.id, s.title, s.slug, s.thumbnail_url, s.aesthetic_tags,
                   s.like_count, s.view_count, s.published_at AS created_at,
                   u.username AS creator_username,
                   u.avatar_url AS creator_avatar_url,
                   u.id AS creator_id
            FROM sets s
            JOIN users u ON u.id = s.user_id
            WHERE s.id != $1
              AND s.aesthetic_tags && $2
              AND s.is_published = TRUE
              AND s.deleted_at IS NULL
            ORDER BY s.like_count DESC
            LIMIT $3
            """,
            set_id, source["aesthetic_tags"], limit,
        )
        return [self._format_feed_row(r) for r in rows]

    async def update_set(self, set_id: str, user_id: str, data: SetUpdateSchema) -> dict:
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        if "canvas_json" in updates:
            updates["canvas_json"] = json.dumps(updates["canvas_json"])
        if updates.get("is_published"):
            updates["published_at"] = datetime.now(timezone.utc)

        if not updates:
            return await self.get_set(set_id)

        set_clauses = ", ".join(f"{k} = ${i+3}" for i, k in enumerate(updates.keys()))
        await self.conn.execute(
            f"UPDATE sets SET {set_clauses}, updated_at = NOW() WHERE id = $1 AND user_id = $2",
            set_id, user_id, *list(updates.values()),
        )

        # If publishing for the first time, notify followers
        if updates.get("is_published"):
            await self._notify_followers_of_new_set(
                creator_id=user_id,
                set_id=set_id,
            )

        return await self.get_set(set_id)

    async def toggle_like(self, set_id: str, user_id: str) -> dict:
        existing = await self.conn.fetchrow(
            "SELECT 1 FROM set_likes WHERE user_id = $1 AND set_id = $2", user_id, set_id
        )
        if existing:
            await self.conn.execute(
                "DELETE FROM set_likes WHERE user_id=$1 AND set_id=$2", user_id, set_id
            )
            await self.conn.execute(
                "UPDATE sets SET like_count=GREATEST(like_count-1,0) WHERE id=$1", set_id
            )
            try:
                await self.conn.execute(
                    """
                    UPDATE user_preferences
                    SET score = GREATEST(score - 1.0, 0),
                        last_interacted_at = NOW()
                    WHERE user_id = $1
                      AND item_id IN (SELECT item_id FROM set_items WHERE set_id = $2)
                    """,
                    user_id, set_id
                )
                await self.conn.execute(
                    """
                    DELETE FROM user_preferences
                    WHERE user_id = $1
                      AND item_id IN (SELECT item_id FROM set_items WHERE set_id = $2)
                      AND score <= 0
                    """,
                    user_id, set_id
                )
            except Exception:
                logger.debug("user_preferences update skipped (table may not exist)")
            liked = False
        else:
            await self.conn.execute(
                "INSERT INTO set_likes(user_id,set_id) VALUES($1,$2) ON CONFLICT (user_id, set_id) DO NOTHING",
                user_id, set_id,
            )
            await self.conn.execute(
                "UPDATE sets SET like_count=like_count+1 WHERE id=$1", set_id
            )
            try:
                await self.conn.execute(
                    """
                    INSERT INTO user_preferences (user_id, item_id, score, last_interacted_at)
                    SELECT $1, si.item_id, 1.0, NOW()
                    FROM set_items si
                    WHERE si.set_id = $2
                    ON CONFLICT (user_id, item_id) DO UPDATE SET
                        score = user_preferences.score + 1.0,
                        last_interacted_at = NOW()
                    """,
                    user_id, set_id
                )
            except Exception:
                logger.debug("user_preferences update skipped (table may not exist)")

            set_owner = await self.conn.fetchval(
                "SELECT user_id FROM sets WHERE id = $1",
                set_id
            )
            if set_owner and str(set_owner) != user_id:
                await self._create_notification(
                    user_id=str(set_owner),
                    type="like",
                    actor_id=user_id,
                    entity_id=set_id,
                    entity_type="set",
                )

            liked = True

        like_count = await self.conn.fetchval(
            "SELECT like_count FROM sets WHERE id = $1", set_id
        )
        return {"liked": liked, "like_count": like_count or 0}

    async def remix(self, set_id: str, remixer_id: str) -> dict:
        original = await self.get_set(set_id)
        if not original or not original.get("is_published"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Set not found or not published")
        remix_data = SetCreateSchema(
            title=f"Remix of {original['title']}",
            canvas_json=original["canvas_json"],
            aesthetic_tags=original.get("aesthetic_tags", []),
            is_published=False,
        )
        remix = await self.create_set(user_id=remixer_id, data=remix_data)
        expiry = datetime.now(timezone.utc) + timedelta(days=30)
        await self.conn.execute(
            """
            INSERT INTO remixes (remix_set_id, original_set_id, revenue_share_pct, share_expiry_date)
            VALUES ($1, $2, 10.00, $3)
            """,
            remix["id"], set_id, expiry,
        )

        original_owner_id = original.get("user_id")
        if original_owner_id and str(original_owner_id) != remixer_id:
            await self._create_notification(
                user_id=str(original_owner_id),
                type="remix",
                actor_id=remixer_id,
                entity_id=remix["id"],
                entity_type="set",
            )

        return remix

    async def edit_set_for_user(self, set_id: str, editor_id: str) -> dict:
        from fastapi import HTTPException

        original = await self.conn.fetchrow(
            """
            SELECT * FROM sets
            WHERE id = $1 AND is_published = TRUE AND deleted_at IS NULL AND privacy = 'public'
            """,
            set_id,
        )
        if not original:
            raise HTTPException(status_code=404, detail="Set not found or not available for editing")

        if str(original["user_id"]) == editor_id:
            raise HTTPException(
                status_code=400,
                detail="Use the regular edit flow for your own sets",
            )

        original_items = await self.conn.fetch(
            """
            SELECT i.id, i.original_url, i.affiliate_url, i.merchant_id,
                   i.processed_image_url, i.product_name, i.price, i.currency,
                   i.category, i.brand, i.status,
                   i.linked_url, i.linked_title, i.linked_description, i.linked_image_url,
                   si.display_order
            FROM set_items si
            JOIN items i ON i.id = si.item_id
            WHERE si.set_id = $1 AND i.deleted_at IS NULL
            ORDER BY si.display_order
            """,
            set_id,
        )

        item_id_map: dict[str, str] = {}

        for item in original_items:
            new_row = await self.conn.fetchrow(
                """
                INSERT INTO items (
                    user_id, original_url, affiliate_url, merchant_id,
                    processed_image_url, product_name, price, currency,
                    category, brand, status,
                    linked_url, linked_title, linked_description, linked_image_url
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                    $12, $13, $14, $15
                )
                RETURNING id
                """,
                editor_id,
                item["original_url"],
                item["affiliate_url"],
                item["merchant_id"],
                item["processed_image_url"],
                item["product_name"],
                item["price"],
                item["currency"],
                item["category"],
                item["brand"],
                item["status"],
                item["linked_url"],
                item["linked_title"],
                item["linked_description"],
                item["linked_image_url"],
            )
            item_id_map[str(item["id"])] = str(new_row["id"])

        logger.info(
            "Cloned items for edit",
            original_set_id=set_id,
            editor_id=editor_id,
            items_cloned=len(item_id_map),
        )

        canvas_json = original["canvas_json"]
        if isinstance(canvas_json, str):
            canvas_json = json.loads(canvas_json)

        if canvas_json and isinstance(canvas_json, dict) and canvas_json.get("objects"):
            for obj in canvas_json["objects"]:
                old_item_id = obj.get("item_id")
                if old_item_id and str(old_item_id) in item_id_map:
                    obj["item_id"] = item_id_map[str(old_item_id)]

        aesthetic_tags = original.get("aesthetic_tags", [])
        if isinstance(aesthetic_tags, str):
            aesthetic_tags = json.loads(aesthetic_tags)

        slug = slugify(f"edit-of-{original['title']}")[:80] + "-" + nanoid(size=6)

        new_set_row = await self.conn.fetchrow(
            """
            INSERT INTO sets (
                user_id, title, slug, canvas_json, thumbnail_url,
                aesthetic_tags, privacy, is_published, published_at,
                parent_set_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NULL, $8)
            RETURNING *
            """,
            editor_id,
            f"Edit of {original['title']}",
            slug,
            json.dumps(canvas_json) if canvas_json else "{}",
            original.get("thumbnail_url"),
            aesthetic_tags,
            "private",
            set_id,
        )

        new_set_id = new_set_row["id"]

        for item in original_items:
            new_item_id = item_id_map[str(item["id"])]
            await self.conn.execute(
                """
                INSERT INTO set_items (set_id, item_id, display_order)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
                """,
                new_set_id,
                new_item_id,
                item["display_order"],
            )

        logger.info(
            "Edit set created",
            new_set_id=new_set_id,
            original_set_id=set_id,
            editor_id=editor_id,
        )

        return await self.get_set(new_set_id, viewer_id=editor_id)

    def _format_feed_row(self, row, liked_set_ids: Optional[set] = None) -> dict:
        r = dict(row)
        r["creator"] = {
            "id": str(r.pop("creator_id")),
            "username": r.pop("creator_username"),
            "avatar_url": r.pop("creator_avatar_url"),
        }
        r["is_liked"] = str(r["id"]) in liked_set_ids if liked_set_ids is not None else False
        r["is_followed_creator"] = r.pop("_is_followed", False)
        r["section"] = r.pop("_section", "algorithmic")
        r["relevance_score"] = r.pop("_relevance_score", 0.0)
        return r