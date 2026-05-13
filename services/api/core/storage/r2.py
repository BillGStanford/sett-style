"""
Platform — Cloudflare R2 Storage

Cloudflare R2 is S3-compatible object storage.
We use boto3 with a custom endpoint URL pointing to R2.

Storage structure:
  items/{item_id}/processed.png     — background-removed item image
  items/{item_id}/original.png      — original image (kept for re-processing)
  sets/{set_id}/thumbnail.png       — exported canvas PNG
  avatars/{user_id}/avatar.png      — user profile photo

All objects are public-read via Cloudflare CDN: https://media.sett.style/
Cache-Control: public, max-age=31536000, immutable (images never change once set)

Cost at launch: Cloudflare R2 free tier = 10 GB storage + 10M GET/month
At 10K users with 50 items avg: 500K images × ~100KB avg = 50 GB
Upgrade cost: $0.015/GB-month beyond free tier = ~$0.60/month at 50 GB

When R2 is NOT configured (empty creds in .env), all upload functions
raise RuntimeError with a clear message. The processor.py falls back to
local file storage in that case.

Future:
- Image variants (thumbnails, WebP conversion) via Cloudflare Images
- Signed URLs for private sets
- Lifecycle rules to delete orphaned originals after 90 days
"""

import asyncio
import io
from typing import Optional

from core.config.settings import settings
from core.logging.logger import get_logger

logger = get_logger(__name__)

_s3_client = None


def _r2_configured() -> bool:
    """Check if R2 has the minimum required credentials."""
    return bool(
        settings.r2_account_id
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
    )


def get_r2_client():
    """
    Singleton R2 (S3-compatible) client.
    Raises RuntimeError if R2 is not configured.
    """
    global _s3_client
    if _s3_client is None:
        if not _r2_configured():
            raise RuntimeError(
                "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, "
                "and R2_SECRET_ACCESS_KEY in services/api/.env"
            )
        import boto3
        from botocore.config import Config
        _s3_client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "adaptive"},
            ),
        )
    return _s3_client


async def upload_to_r2(key: str, data: bytes, content_type: str = "image/png") -> str:
    """
    Upload bytes to R2. Returns the public CDN URL.

    Uses asyncio.get_event_loop().run_in_executor to avoid blocking the event loop
    (boto3 is synchronous).

    Raises RuntimeError if R2 is not configured.

    Args:
        key:          Storage path, e.g. "items/abc123/processed.png"
        data:         Raw bytes to upload
        content_type: MIME type

    Returns:
        Public URL: https://media.sett.style/items/abc123/processed.png
    """
    if not _r2_configured():
        raise RuntimeError(
            "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, "
            "and R2_SECRET_ACCESS_KEY in services/api/.env"
        )

    def _upload():
        client = get_r2_client()
        client.put_object(
            Bucket=settings.r2_bucket_name,
            Key=key,
            Body=data,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
        return f"{settings.r2_public_url}/{key}"

    loop = asyncio.get_event_loop()
    public_url = await loop.run_in_executor(None, _upload)
    logger.info("Uploaded to R2", key=key, size=len(data))
    return public_url


async def delete_from_r2(key: str) -> None:
    """Delete an object from R2. No-op if R2 is not configured."""
    if not _r2_configured():
        logger.debug("R2 not configured, skip delete", key=key)
        return

    def _delete():
        client = get_r2_client()
        client.delete_object(Bucket=settings.r2_bucket_name, Key=key)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _delete)
    logger.info("Deleted from R2", key=key)


async def generate_presigned_upload_url(key: str, content_type: str, expires: int = 300) -> Optional[str]:
    """
    Generate a presigned URL for direct client-side upload.
    Used for canvas thumbnail export: client uploads PNG directly to R2,
    bypassing the API server (no bandwidth cost on Railway).

    Returns None if R2 is not configured.

    expires: seconds until URL expires (default 5 minutes)
    """
    if not _r2_configured():
        return None

    def _presign():
        client = get_r2_client()
        return client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.r2_bucket_name,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires,
        )

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _presign)