import base64
import json
import time

import pytest
from jose import jwt

from core.auth.dependencies import _get_sub
from core.config.settings import settings


def _token(secret: str, subject: str = "user-123") -> str:
    return jwt.encode(
        {
            "sub": subject,
            "aud": "authenticated",
            "exp": int(time.time()) + 300,
            "email": "creator@example.test",
        },
        secret,
        algorithm="HS256",
    )


def test_get_sub_accepts_valid_signed_access_token(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test-only-signing-secret")
    assert _get_sub(_token("test-only-signing-secret")) == "user-123"


def test_get_sub_rejects_forged_token(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test-only-signing-secret")
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": "admin-user", "aud": "authenticated", "exp": int(time.time()) + 300}).encode()
    ).decode().rstrip("=")
    forged = f"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{payload}.not-a-valid-signature"
    assert _get_sub(forged) is None


def test_get_sub_fails_closed_without_configured_secret(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "")
    assert _get_sub(_token("any-secret")) is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://10.0.0.8/",
        "http://169.254.169.254/latest/meta-data/",
        "http://localhost/",
        "file:///etc/passwd",
    ],
)
async def test_remote_ingestion_rejects_local_and_non_http_targets(url):
    from domains.items.processor import _validate_public_url

    assert await _validate_public_url(url) is False
