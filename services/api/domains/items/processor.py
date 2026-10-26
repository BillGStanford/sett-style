"""
Items Domain — Background Processor

Handles the async pipeline after an item is created:
  1. Fetch product page HTML
  2. Extract OG image URL, product name, price
  3. Download the image
  4. Run rembg background removal (CPU, ~2-5 seconds)
  5. Upload processed PNG to Cloudflare R2 (or save locally if R2 not configured)
  6. Update item record with processed_image_url + metadata

This runs as a FastAPI BackgroundTask (simple, works at launch).

Scale upgrade path:
  → At 1,000 items/day: switch to Redis queue (ARQ or Celery)
  → At 10,000 items/day: dedicated worker service on Railway.app
  → At 100K items/day: distributed workers + GPU-accelerated rembg

Performance notes:
  - rembg loads the U2Net ONNX model on first call (~500ms cold start)
  - Subsequent calls: ~2-3 seconds per image on Railway free tier CPU
  - Model is cached in memory after first load
  - Railway free tier: ~200 jobs/day. Hobby ($5/mo): ~2,000/day
"""

import asyncio
import io
import os
import ipaddress
import socket
from urllib.parse import urljoin, urlsplit
from pathlib import Path
from typing import Optional

import httpx
from bs4 import BeautifulSoup
import asyncpg

from core.config.settings import settings
from core.database.connection import get_pool
from core.logging.logger import get_logger

logger = get_logger(__name__)

# Local uploads directory — used when R2 is not configured
_UPLOADS_DIR = (
    Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))))
    / "uploads" / "items"
)
_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# rembg model loaded lazily (singleton)
_rembg_session = None


def _get_rembg_session():
    """Lazy-load rembg ONNX session. Cached after first call."""
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session
        _rembg_session = new_session("u2net")
        logger.info("rembg U2Net model loaded")
    return _rembg_session


def _r2_configured() -> bool:
    """Check if R2 has the minimum required credentials."""
    return bool(
        settings.r2_account_id
        and settings.r2_access_key_id
        and settings.r2_secret_access_key
    )


def _save_locally(item_id: str, image_bytes: bytes) -> str:
    """Save to local uploads/ directory. Returns full URL for StaticFiles."""
    filepath = _UPLOADS_DIR / f"{item_id}.png"
    filepath.write_bytes(image_bytes)
    # Full URL because the frontend runs on port 3000 but uploads
    # are served by the API on port 8000. In production, R2 would
    # be configured and this function wouldn't be called.
    return f"http://localhost:8000/uploads/items/{item_id}.png"


async def _upload_image(item_id: str, image_bytes: bytes) -> str:
    """Upload to R2 if configured, otherwise save locally."""
    if _r2_configured():
        from core.storage.r2 import upload_to_r2
        r2_key = f"items/{item_id}/processed.png"
        return await upload_to_r2(key=r2_key, data=image_bytes, content_type="image/png")
    else:
        logger.info("R2 not configured, saving locally", item_id=item_id)
        return _save_locally(item_id, image_bytes)


async def process_item(item_id: str, url: str) -> None:
    """
    Full item processing pipeline. Runs in a background task.
    Updates the item record on completion or failure.
    """
    conn = None
    try:
        pool = get_pool()
        conn = await pool.acquire()

        logger.info("Processing item", item_id=item_id)

        # Step 1: Fetch product page
        page_data = await _fetch_product_page(url)
        if not page_data:
            await _mark_failed(conn, item_id, "Could not fetch product page")
            return

        # Step 2: Download image
        image_bytes = await _download_image(page_data["image_url"])
        if not image_bytes:
            await _mark_failed(conn, item_id, "Could not download product image")
            return

        # Step 3: Remove background (sync — runs in thread pool to avoid blocking event loop)
        processed_bytes = await asyncio.get_event_loop().run_in_executor(
            None, _remove_background, image_bytes
        )

        # Step 4: Upload to R2 or save locally
        public_url = await _upload_image(item_id, processed_bytes)

        # Step 5: Update item record
        await conn.execute(
            """
            UPDATE items SET
                processed_image_url = $1,
                product_name = COALESCE(product_name, $2),
                price = COALESCE(price, $3),
                brand = COALESCE(brand, $4),
                status = 'ready',
                updated_at = NOW()
            WHERE id = $5
            """,
            public_url,
            page_data.get("product_name"),
            page_data.get("price"),
            page_data.get("brand"),
            item_id,
        )

        logger.info("Item processed successfully", item_id=item_id, url=public_url)

    except Exception as e:
        logger.error("Item processing failed", item_id=item_id, error=str(e))
        if conn:
            await _mark_failed(conn, item_id, str(e))
    finally:
        if conn:
            await get_pool().release(conn)


async def process_uploaded_image(item_id: str, image_bytes: bytes) -> None:
    """Process a directly uploaded image — skip URL fetch, go straight to rembg."""
    conn = None
    try:
        pool = get_pool()
        conn = await pool.acquire()

        # Save original locally (skip R2 for original if not configured)
        if _r2_configured():
            from core.storage.r2 import upload_to_r2
            original_key = f"items/{item_id}/original.png"
            await upload_to_r2(key=original_key, data=image_bytes, content_type="image/png")
        else:
            # Save original locally too
            orig_path = _UPLOADS_DIR / f"{item_id}_original.png"
            orig_path.write_bytes(image_bytes)

        # Background removal
        processed_bytes = await asyncio.get_event_loop().run_in_executor(
            None, _remove_background, image_bytes
        )

        # Upload processed
        public_url = await _upload_image(item_id, processed_bytes)

        await conn.execute(
            "UPDATE items SET processed_image_url = $1, status = 'ready', updated_at = NOW() WHERE id = $2",
            public_url, item_id,
        )
        logger.info("Uploaded image processed", item_id=item_id)
    except Exception as e:
        logger.error("Upload processing failed", item_id=item_id, error=str(e))
        if conn:
            await _mark_failed(conn, item_id, str(e))
    finally:
        if conn:
            await get_pool().release(conn)


async def _validate_public_url(url: str) -> bool:
    """Reject local/private targets and unsafe URL forms before outbound requests."""
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return False
        if parsed.username or parsed.password:
            return False
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        if port not in (80, 443) or (parsed.scheme == "http" and port != 80) or (parsed.scheme == "https" and port != 443):
            return False
        host = parsed.hostname.rstrip(".").lower()
        if host in ("localhost",) or host.endswith((".localhost", ".local", ".internal")):
            return False

        try:
            addresses = [ipaddress.ip_address(host)]
        except ValueError:
            loop = asyncio.get_running_loop()
            records = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
            addresses = [ipaddress.ip_address(record[4][0]) for record in records]
        return bool(addresses) and all(address.is_global for address in addresses)
    except (ValueError, OSError, socket.gaierror):
        return False


async def _safe_get(
    url: str,
    *,
    max_bytes: int,
    allowed_content_types: tuple[str, ...],
) -> Optional[tuple[bytes, str, str]]:
    """Fetch a public URL with bounded bytes and validation on every redirect."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; SETTStyleBot/1.0)",
        "Accept": ", ".join(allowed_content_types),
    }
    current_url = url
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(12.0, connect=5.0),
            follow_redirects=False,
            trust_env=False,
            headers=headers,
        ) as client:
            for _ in range(5):
                if not await _validate_public_url(current_url):
                    logger.warning("Blocked unsafe outbound URL", url=current_url)
                    return None
                async with client.stream("GET", current_url) as response:
                    if response.status_code in (301, 302, 303, 307, 308):
                        location = response.headers.get("location")
                        if not location:
                            return None
                        current_url = urljoin(str(response.url), location)
                        continue
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
                    if not any(content_type == kind or (kind.endswith("/") and content_type.startswith(kind)) for kind in allowed_content_types):
                        logger.warning("Rejected outbound response content type", content_type=content_type)
                        return None
                    content_length = response.headers.get("content-length")
                    if content_length and int(content_length) > max_bytes:
                        logger.warning("Rejected oversized outbound response", content_length=content_length)
                        return None
                    data = bytearray()
                    async for chunk in response.aiter_bytes():
                        data.extend(chunk)
                        if len(data) > max_bytes:
                            logger.warning("Stopped oversized outbound response", max_bytes=max_bytes)
                            return None
                    return bytes(data), str(response.url), content_type
        return None
    except (httpx.HTTPError, ValueError, OSError) as exc:
        logger.warning("Safe outbound request failed", url=current_url, error=str(exc))
        return None


async def _fetch_product_page(url: str) -> Optional[dict]:
    """Fetch a product page safely and extract common product metadata."""
    result = await _safe_get(
        url,
        max_bytes=2_000_000,
        allowed_content_types=("text/html",),
    )
    if not result:
        return None
    page_bytes, final_url, _ = result
    try:
        soup = BeautifulSoup(page_bytes, "lxml")
        og_image = soup.find("meta", property="og:image")
        og_title = soup.find("meta", property="og:title")
        og_price = soup.find("meta", property="product:price:amount")
        og_brand = soup.find("meta", property="og:site_name")
        image_url = og_image.get("content") if og_image else None
        if not image_url:
            image = soup.find("img", src=True)
            image_url = image.get("src") if image else None
        if not image_url:
            return None

        image_url = urljoin(final_url, image_url.strip())
        price = None
        if og_price and og_price.get("content"):
            try:
                price = float(og_price["content"])
                if price < 0 or price > 10_000_000:
                    price = None
            except (TypeError, ValueError):
                price = None
        return {
            "image_url": image_url,
            "product_name": og_title.get("content") if og_title else None,
            "price": price,
            "brand": og_brand.get("content") if og_brand else None,
        }
    except Exception as exc:
        logger.warning("Failed to parse product page", url=final_url, error=str(exc))
        return None


async def _download_image(image_url: str) -> Optional[bytes]:
    """Download a bounded raster image from a validated public destination."""
    result = await _safe_get(
        image_url,
        max_bytes=12_000_000,
        allowed_content_types=("image/png", "image/jpeg", "image/webp"),
    )
    return result[0] if result else None


def _remove_background(image_bytes: bytes) -> bytes:
    """
    Remove background from an image using rembg (U2Net ONNX).
    Returns PNG bytes with transparent background.

    Runs synchronously (CPU-bound) — called via run_in_executor.
    Processing time: ~2-5 seconds on Railway free tier.
    """
    from rembg import remove
    session = _get_rembg_session()
    result = remove(image_bytes, session=session)
    return result


async def _mark_failed(conn: asyncpg.Connection, item_id: str, error: str) -> None:
    await conn.execute(
        "UPDATE items SET status = 'failed', processing_error = $1, updated_at = NOW() WHERE id = $2",
        error[:500], item_id,
    )