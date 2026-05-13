"""
Users Domain — Service Layer
"""

import asyncpg
import json
from typing import Optional
import bcrypt
from nanoid import generate as nanoid

from domains.users.schemas import (
    UserCreateSchema, UserLoginSchema, UserUpdateSchema,
    OnboardingSchema, OnboardingStepSchema, TokenResponseSchema, UserProfileSchema,
)
from core.auth.jwt import create_access_token
from core.logging.logger import get_logger

logger = get_logger(__name__)

_ROW_COLS = """
    id, email, username, bio, avatar_url, goal,
    style_prefs, plan, wallet_balance, total_earned,
    email_verified AS is_email_verified, user_tier,
    referral_code, referred_by, show_followers,
    age_range, gender_identity, discovery_source,
    onboarding_step, onboarding_completed_at, location
"""


class UsersService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    def _row_to_profile(self, row, is_following: bool = False, stats: dict = None) -> UserProfileSchema:
        data = dict(row)
        raw = data.get("style_prefs")
        if raw is None:
            data["style_prefs"] = []
        elif isinstance(raw, str):
            try:
                data["style_prefs"] = json.loads(raw)
            except Exception:
                data["style_prefs"] = []
        data["id"] = str(data["id"])
        data["referred_by"] = str(data["referred_by"]) if data.get("referred_by") else None
        data["is_following"] = is_following
        data["followers_count"] = stats.get("followers", 0) if stats else 0
        data["following_count"] = stats.get("following", 0) if stats else 0
        data["sets_count"] = stats.get("sets", 0) if stats else 0
        data["total_likes"] = stats.get("likes", 0) if stats else 0
        return UserProfileSchema(**data)

    async def _validate_referral_code_async(self, referral_code: str, new_user_id: str = None) -> Optional[str]:
        referrer = await self.conn.fetchrow(
            "SELECT id FROM users WHERE referral_code = $1 AND deleted_at IS NULL",
            referral_code,
        )
        if not referrer:
            return None
        if new_user_id and str(referrer["id"]) == new_user_id:
            return None
        return str(referrer["id"])

    async def _get_profile_stats(self, user_id: str) -> dict:
        row = await self.conn.fetchrow(
            """
            SELECT
                (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS followers,
                (SELECT COUNT(*) FROM follows WHERE follower_id = $1) AS following,
                (SELECT COUNT(*) FROM sets WHERE user_id = $1 AND is_published = TRUE AND deleted_at IS NULL) AS sets,
                (SELECT COALESCE(SUM(like_count), 0) FROM sets WHERE user_id = $1 AND deleted_at IS NULL) AS likes
            """,
            user_id,
        )
        return {
            "followers": row["followers"] if row else 0,
            "following": row["following"] if row else 0,
            "sets": row["sets"] if row else 0,
            "likes": row["likes"] if row else 0,
        }

    async def _create_notification(
        self,
        user_id: str,
        type: str,
        actor_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None,
    ):
        """Helper to create notification (non-blocking, doesn't fail on error)."""
        try:
            messages = {
                "follow": "started following you",
                "like": "liked your set",
                "remix": "remixed your set",
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

    async def create_user(self, data: UserCreateSchema) -> TokenResponseSchema:
        from fastapi import HTTPException

        existing = await self.conn.fetchrow(
            "SELECT id, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL", data.email
        )

        if existing:
            if not existing["password_hash"]:
                pw_hash = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                referred_by = None
                if data.referral_code:
                    referred_by = await self._validate_referral_code_async(data.referral_code, str(existing["id"]))

                update_fields = ["password_hash = $1"]
                update_values = [pw_hash]
                if referred_by:
                    update_fields.append("referred_by = $2")
                    update_values.append(referred_by)

                await self.conn.execute(
                    f"UPDATE users SET {', '.join(update_fields)} WHERE id = ${len(update_values) + 1}",
                    *update_values, existing["id"],
                )
                row = await self.conn.fetchrow(
                    f"SELECT {_ROW_COLS} FROM users WHERE id = $1", existing["id"]
                )
                user = self._row_to_profile(row)
                token = create_access_token({"sub": user.id})
                logger.info("User registered (backfilled password)", user_id=user.id, has_referral=bool(referred_by))
                return TokenResponseSchema(access_token=token, user=user)

            raise HTTPException(status_code=409, detail="Email already registered")

        pw_hash = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        ref_code = nanoid(size=8)

        referred_by = None
        if data.referral_code:
            referred_by = await self._validate_referral_code_async(data.referral_code)

        count = await self.conn.fetchval("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")
        if count < 100:
            tier = 'founder'
        elif count < 600:
            tier = 'early_user'
        else:
            tier = 'general'

        if referred_by:
            row = await self.conn.fetchrow(
                f"INSERT INTO users (email, password_hash, referral_code, user_tier, referred_by) VALUES ($1,$2,$3,$4,$5) RETURNING {_ROW_COLS}",
                data.email, pw_hash, ref_code, tier, referred_by,
            )
        else:
            row = await self.conn.fetchrow(
                f"INSERT INTO users (email, password_hash, referral_code, user_tier) VALUES ($1,$2,$3,$4) RETURNING {_ROW_COLS}",
                data.email, pw_hash, ref_code, tier,
            )

        user = self._row_to_profile(row)
        token = create_access_token({"sub": user.id})
        logger.info("User registered", user_id=user.id, tier=tier, has_referral=bool(referred_by))
        return TokenResponseSchema(access_token=token, user=user)

    async def login(self, data: UserLoginSchema) -> TokenResponseSchema:
        row = await self.conn.fetchrow(
            f"SELECT {_ROW_COLS}, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL",
            data.email,
        )

        from fastapi import HTTPException

        if not row:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not row["password_hash"]:
            raise HTTPException(
                status_code=401,
                detail="This account uses Google or Apple sign-in. Use the OAuth button instead.",
            )

        if not bcrypt.checkpw(data.password.encode('utf-8'), row["password_hash"].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        d = dict(row)
        d.pop("password_hash", None)
        d["id"] = str(d["id"])
        raw = d.get("style_prefs")
        if raw is None:
            d["style_prefs"] = []
        elif isinstance(raw, str):
            try:
                d["style_prefs"] = json.loads(raw)
            except Exception:
                d["style_prefs"] = []
        d["referred_by"] = str(d["referred_by"]) if d.get("referred_by") else None
        user = UserProfileSchema(**d)
        token = create_access_token({"sub": user.id})
        return TokenResponseSchema(access_token=token, user=user)

    async def update_onboarding_step(self, user_id: str, step: int) -> dict:
        """Track onboarding progress - called on each step transition."""
        await self.conn.execute(
            "UPDATE users SET onboarding_step = $1, updated_at = NOW() WHERE id = $2",
            step, user_id,
        )
        return {"status": "ok", "step": step}

    async def complete_onboarding(self, user_id: str, data: OnboardingSchema) -> dict:
        existing = await self.conn.fetchrow(
            "SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL AND id != $2",
            data.username, user_id,
        )
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="Username taken")

        await self.conn.execute(
            """
            UPDATE users SET 
                username = $1, 
                style_prefs = $2, 
                goal = $3,
                age_range = $4,
                gender_identity = $5,
                discovery_source = $6,
                location = $7,
                onboarding_step = NULL,
                onboarding_completed_at = NOW(),
                updated_at = NOW() 
            WHERE id = $8
            """,
            data.username, 
            json.dumps(data.style_prefs), 
            data.goal,
            data.age_range,
            data.gender_identity,
            data.discovery_source,
            data.location,
            user_id,
        )
        
        logger.info(
            "Onboarding completed",
            user_id=user_id,
            username=data.username,
            has_location=bool(data.location),
            has_age_range=bool(data.age_range),
            has_gender=bool(data.gender_identity),
            has_discovery_source=bool(data.discovery_source),
        )
        
        return {"status": "ok"}

    async def get_user_by_id(self, user_id: str) -> Optional[UserProfileSchema]:
        row = await self.conn.fetchrow(
            f"SELECT {_ROW_COLS} FROM users WHERE id=$1 AND deleted_at IS NULL", user_id
        )
        if not row:
            return None
        stats = await self._get_profile_stats(user_id)
        return self._row_to_profile(row, stats=stats)

    async def get_user_by_username(self, username: str, viewer_id: Optional[str] = None) -> Optional[UserProfileSchema]:
        row = await self.conn.fetchrow(
            f"SELECT {_ROW_COLS} FROM users WHERE username=$1 AND deleted_at IS NULL", username
        )
        if not row:
            return None

        # Don't expose demographic fields on public profiles
        d = dict(row)
        if viewer_id and str(row["id"]) != viewer_id:
            # Viewing someone else's profile - strip sensitive fields
            d["age_range"] = None
            d["gender_identity"] = None
            d["discovery_source"] = None
            d["onboarding_step"] = None
            d["onboarding_completed_at"] = None

        is_following = False
        if viewer_id and str(row["id"]) != viewer_id:
            follow_row = await self.conn.fetchval(
                "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
                viewer_id, row["id"]
            )
            is_following = follow_row is not None

        stats = await self._get_profile_stats(row["id"])
        
        # Create profile from potentially modified dict
        if d != dict(row):
            class SimpleRow:
                def __init__(self, data):
                    self._data = data
                def __getitem__(self, key):
                    return self._data[key]
                def keys(self):
                    return self._data.keys()
            row = SimpleRow(d)
        
        return self._row_to_profile(row, is_following=is_following, stats=stats)

    async def update_user(self, user_id: str, data: UserUpdateSchema) -> Optional[UserProfileSchema]:
        """Update user profile. Handles empty strings as NULL for nullable fields."""
        # Filter out None values
        updates = {k: v for k, v in data.model_dump().items() if v is not None}
        
        if not updates:
            return await self.get_user_by_id(user_id)
        
        # Convert empty strings to NULL for location and demographic fields
        # This allows users to clear their selection by sending ""
        nullable_string_fields = ['location', 'age_range', 'gender_identity', 'discovery_source', 'bio']
        for field in nullable_string_fields:
            if field in updates and updates[field] == '':
                updates[field] = None
        
        # Build dynamic UPDATE query
        set_clauses = []
        values = [user_id]
        param_counter = 2  # Start from $2 because $1 is user_id
        
        for field, value in updates.items():
            set_clauses.append(f"{field} = ${param_counter}")
            values.append(value)
            param_counter += 1
        
        # Add updated_at
        set_clauses.append(f"updated_at = NOW()")
        
        query = f"""
            UPDATE users 
            SET {', '.join(set_clauses)}
            WHERE id = $1
        """
        
        await self.conn.execute(query, *values)
        
        # Return updated user
        return await self.get_user_by_id(user_id)

    async def follow(self, follower_id: str, following_id: str) -> None:
        new_follow = await self.conn.fetchval(
            """
            WITH ins AS (
                INSERT INTO follows (follower_id, following_id)
                VALUES ($1, $2)
                ON CONFLICT (follower_id, following_id) DO NOTHING
                RETURNING 1
            )
            SELECT COUNT(*) FROM ins
            """,
            follower_id, following_id,
        )

        if new_follow:
            await self._create_notification(
                user_id=following_id,
                type="follow",
                actor_id=follower_id,
            )

    async def unfollow(self, follower_id: str, following_id: str) -> None:
        await self.conn.execute(
            "DELETE FROM follows WHERE follower_id=$1 AND following_id=$2",
            follower_id, following_id,
        )

    async def get_followers_list(self, profile_user_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
        rows = await self.conn.fetch(
            """
            SELECT u.id, u.username, u.avatar_url
            FROM follows f
            JOIN users u ON u.id = f.follower_id
            WHERE f.following_id = $1 AND u.deleted_at IS NULL
            ORDER BY f.created_at DESC
            LIMIT $2 OFFSET $3
            """,
            profile_user_id, limit, offset
        )
        return [dict(r) for r in rows]

    async def get_following_list(self, profile_user_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
        rows = await self.conn.fetch(
            """
            SELECT u.id, u.username, u.avatar_url
            FROM follows f
            JOIN users u ON u.id = f.following_id
            WHERE f.follower_id = $1 AND u.deleted_at IS NULL
            ORDER BY f.created_at DESC
            LIMIT $2 OFFSET $3
            """,
            profile_user_id, limit, offset
        )
        return [dict(r) for r in rows]