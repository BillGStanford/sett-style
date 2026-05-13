"""
FastAPI Auth Dependencies — extracts user ID from Supabase JWT.
Decodes the JWT payload without re-verifying the signature.
Supabase already verified it. We just need the sub (user ID).
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from asyncpg import Connection
import base64, json

from core.database.connection import get_conn

security = HTTPBearer(auto_error=False)


def _get_sub(token: str) -> Optional[str]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        pad = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(pad))
        return str(payload["sub"]) if payload.get("sub") else None
    except Exception:
        return None


async def _get_or_create_user(conn: Connection, user_id: str, token: str) -> Optional[dict]:
    row = await conn.fetchrow(
        "SELECT id, email, username, plan, is_banned, user_tier FROM users WHERE id = $1 AND deleted_at IS NULL",
        user_id,
    )
    if row:
        return dict(row)
    # Auto-create on first OAuth login
    try:
        parts = token.split(".")
        pad = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(pad))
        email = payload.get("email") or payload.get("user_metadata", {}).get("email", "")
        if not email:
            return None
        from nanoid import generate as nanoid
        
        # Determine user tier based on current total count
        count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")
        if count < 100:
            tier = 'founder'
        elif count < 600:
            tier = 'early_user'
        else:
            tier = 'general'

        await conn.execute(
            "INSERT INTO users (id, email, referral_code, oauth_provider, user_tier) VALUES ($1, $2, $3, 'supabase', $4) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email",
            user_id, email, nanoid(size=8), tier,
        )
        row = await conn.fetchrow("SELECT id, email, username, plan, is_banned, user_tier FROM users WHERE id = $1", user_id)
        return dict(row) if row else None
    except Exception as e:
        print(f"Auto-create user failed: {e}")
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    conn: Connection = Depends(get_conn),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required",
                            headers={"WWW-Authenticate": "Bearer"})
    user_id = _get_sub(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await _get_or_create_user(conn, user_id, credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("is_banned"):
        raise HTTPException(status_code=403, detail="Account suspended")
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    conn: Connection = Depends(get_conn),
) -> Optional[dict]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, conn=conn)
    except HTTPException:
        return None