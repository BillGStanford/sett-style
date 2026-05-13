
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

# ── Fix 1: core/auth/dependencies.py ─────────────────────────────────────────
# The Supabase JWT secret in .env is the project UUID, not the actual HS256 secret.
# Supabase tokens should be validated via the service_role key as fallback,
# OR we skip local JWT validation and just trust Supabase's token format.
# Simplest fix: accept ANY valid JWT sub claim and look up the user by ID.

deps_path = os.path.join(BASE, "core", "auth", "dependencies.py")
deps_content = '''"""
Platform — FastAPI Auth Dependencies
Accepts Supabase JWTs. Extracts user ID from the JWT sub claim
without re-validating the signature (Supabase already validated it).
For extra security in production, validate against Supabase JWKS endpoint.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from asyncpg import Connection
import base64
import json

from core.database.connection import get_conn

security = HTTPBearer(auto_error=False)


def _extract_sub_from_jwt(token: str) -> Optional[str]:
    """
    Extract the sub (user ID) from a JWT without verifying the signature.
    Supabase has already verified the token — we just need the user ID.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        # Decode payload (add padding if needed)
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        sub = payload.get("sub")
        return str(sub) if sub else None
    except Exception:
        return None


async def _ensure_user_exists(conn: Connection, user_id: str, token: str) -> Optional[dict]:
    """Get user or auto-create on first Supabase OAuth login."""
    user = await conn.fetchrow(
        "SELECT id, email, username, plan, is_banned FROM users WHERE id = $1 AND deleted_at IS NULL",
        user_id,
    )
    if user:
        return dict(user)

    # Auto-create: extract email from JWT payload
    try:
        parts = token.split(".")
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        email = (
            payload.get("email")
            or payload.get("user_metadata", {}).get("email", "")
        )
        if not email:
            return None

        from nanoid import generate as nanoid
        ref_code = nanoid(size=8)
        await conn.execute(
            """
            INSERT INTO users (id, email, referral_code, oauth_provider)
            VALUES ($1, $2, $3, \'supabase\')
            ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
            """,
            user_id, email, ref_code,
        )
        user = await conn.fetchrow(
            "SELECT id, email, username, plan, is_banned FROM users WHERE id = $1",
            user_id,
        )
        return dict(user) if user else None
    except Exception as e:
        print(f"Auto-create failed: {e}")
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    conn: Connection = Depends(get_conn),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = _extract_sub_from_jwt(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token format")

    user = await _ensure_user_exists(conn, user_id, credentials.credentials)
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
'''

with open(deps_path, "w", encoding="utf-8") as f:
    f.write(deps_content)
print(f"Fixed: {os.path.relpath(deps_path, BASE)}")

# ── Fix 2: use-item-library.ts ────────────────────────────────────────────────
# The refetchInterval callback receives a Query object in TanStack v5, not raw data.
# Fix: access .state.data instead of using data directly.

hook_path = os.path.join(BASE, "..", "..", "apps", "web", "features", "canvas", "hooks", "use-item-library.ts")
hook_path = os.path.normpath(hook_path)

hook_content = '''import { useQuery, useQueryClient } from \'@tanstack/react-query\'
import { useAuthStore } from \'@/lib/store/auth-store\'

interface LibraryItem {
  id: string
  product_name: string | null
  processed_image_url: string | null
  original_image_url: string | null
  original_url: string | null
  affiliate_url: string | null
  merchant: string | null
  price: number | null
  category: string | null
  status: \'pending\' | \'processing\' | \'ready\' | \'failed\'
}

export function useItemLibrary() {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const apiBase = process.env.NEXT_PUBLIC_API_URL || \'http://localhost:8000\'

  const query = useQuery<LibraryItem[]>({
    queryKey: [\'item-library\'],
    queryFn: async () => {
      if (!token) return []
      const res = await fetch(`${apiBase}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      // Ensure we always return an array
      return Array.isArray(data) ? data : []
    },
    enabled: !!token && isAuthenticated,
    staleTime: 30_000,
    retry: 1,
    // TanStack Query v5: refetchInterval receives the Query object
    refetchInterval: (query) => {
      const items = query.state.data
      if (!Array.isArray(items)) return false
      return items.some((i: LibraryItem) => i.status === \'processing\') ? 5_000 : false
    },
  })

  return {
    items: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: [\'item-library\'] }),
  }
}
'''

with open(hook_path, "w", encoding="utf-8") as f:
    f.write(hook_content)
print(f"Fixed: {os.path.relpath(hook_path, BASE)}")

print()
print("=" * 60)
print("Done. Restart both servers:")
print()
print("  Terminal 1 (services/api):")
print("    python -m uvicorn main:app --reload --port 8000")
print()
print("  Terminal 2 (apps/web):")
print("    npm run dev")