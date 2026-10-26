"""
FastAPI Auth Dependencies — extracts user ID from Supabase JWT.
Verifies Supabase access tokens before trusting claims.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from asyncpg import Connection
from jose import JWTError, jwt
from core.config.settings import settings

from core.database.connection import get_conn

security = HTTPBearer(auto_error=False)


def _decode_claims(token: str) -> Optional[dict]:
    """Verify a Supabase HS256 access token before using any claim.

    Configure SUPABASE_JWT_SECRET with the project's JWT signing secret.
    Fail closed when it is absent; an unverified payload must never establish identity.
    """
    secret = settings.supabase_jwt_secret
    if not secret:
        return None
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require_sub": True, "require_exp": True},
        )
        return claims if isinstance(claims, dict) else None
    except (JWTError, TypeError, ValueError):
        return None


def _get_sub(token: str) -> Optional[str]:
    claims = _decode_claims(token)
    subject = claims.get("sub") if claims else None
    return str(subject) if subject else None


async def _get_or_create_user(conn: Connection, user_id: str, token: str) -> Optional[dict]:
    row = await conn.fetchrow(
        "SELECT id, email, username, plan, is_banned, user_tier FROM users WHERE id = $1 AND deleted_at IS NULL",
        user_id,
    )
    if row:
        return dict(row)
    # Auto-create on first OAuth login
    try:
        payload = _decode_claims(token)
        if not payload:
            return None
        metadata = payload.get("user_metadata") or {}
        email = payload.get("email") or metadata.get("email", "")
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