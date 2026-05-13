"""
Platform — JWT Auth Utilities

SETT uses JWT for stateless authentication.
Tokens are short-lived (7 days) and not stored server-side.

Flow:
  1. User logs in → server issues JWT
  2. Frontend stores token in memory (NOT localStorage — XSS risk)
  3. Every API request includes: Authorization: Bearer <token>
  4. Server validates token signature + expiry on every request

Future:
  - Refresh token rotation (secure httpOnly cookie)
  - Token revocation via Redis blocklist (for logout all devices)
  - Short-lived access tokens (15 min) + long-lived refresh tokens (30 days)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError

from core.config.settings import settings
from core.logging.logger import get_logger

logger = get_logger(__name__)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT. Returns payload dict or None if invalid."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError as e:
        logger.debug("JWT decode failed", error=str(e))
        return None
