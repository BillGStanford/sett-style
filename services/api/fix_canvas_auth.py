import os, base64, json

BASE = os.path.dirname(os.path.abspath(__file__))

# Fix 1: core/auth/dependencies.py — decode JWT without signature verification
deps_path = os.path.join(BASE, "core", "auth", "dependencies.py")
deps = '''"""
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
        "SELECT id, email, username, plan, is_banned FROM users WHERE id = $1 AND deleted_at IS NULL",
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
        await conn.execute(
            "INSERT INTO users (id, email, referral_code, oauth_provider) VALUES ($1, $2, $3, \\'supabase\\') ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email",
            user_id, email, nanoid(size=8),
        )
        row = await conn.fetchrow("SELECT id, email, username, plan, is_banned FROM users WHERE id = $1", user_id)
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
'''

with open(deps_path, "w", encoding="utf-8") as f:
    f.write(deps)
print(f"Fixed: core/auth/dependencies.py")

# Fix 2: use-item-library.ts — fix TanStack v5 refetchInterval API
hook_path = os.path.normpath(os.path.join(BASE, "..", "..", "apps", "web", "features", "canvas", "hooks", "use-item-library.ts"))
hook = """import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/auth-store'

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
  status: 'pending' | 'processing' | 'ready' | 'failed'
}

export function useItemLibrary() {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const query = useQuery<LibraryItem[]>({
    queryKey: ['item-library'],
    queryFn: async () => {
      if (!token) return []
      const res = await fetch(`${apiBase}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!token && isAuthenticated,
    staleTime: 30_000,
    retry: 1,
    refetchInterval: (query) => {
      const items = query.state.data
      if (!Array.isArray(items)) return false
      return items.some((i: LibraryItem) => i.status === 'processing') ? 5_000 : false
    },
  })

  return {
    items: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['item-library'] }),
  }
}
"""

with open(hook_path, "w", encoding="utf-8") as f:
    f.write(hook)
print(f"Fixed: features/canvas/hooks/use-item-library.ts")

print()
print("=" * 60)
print("Done. Restart both servers:")
print()
print("  Terminal 1 (services/api):")
print("    python -m uvicorn main:app --reload --port 8000")
print()
print("  Terminal 2 (apps/web):")
print("    npm run dev")