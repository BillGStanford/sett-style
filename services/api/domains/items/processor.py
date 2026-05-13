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


async def _fetch_product_page(url: str) -> Optional[dict]:
    """
    Fetch a product page and extract metadata.

    Extraction priority:
    1. Open Graph tags (og:image, og:title, og:price:amount)
    2. Schema.org Product structured data
    3. Fallback: largest img tag on page

    Most major retailers (ASOS, Zara, COS, H&M) have good OG tags.
    For retailers without OG, we fall back to Schema.org.
    """
    try:
        # Realistic browser headers — many retailers (ASOS, Zara, Nike)
        # block requests without a proper User-Agent and accept headers.
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        }

        async with httpx.AsyncClient(
            timeout=15.0,
            headers=headers,
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # Try OG image first
        og_image = soup.find("meta", property="og:image")
        og_title = soup.find("meta", property="og:title")
        og_price = soup.find("meta", property="product:price:amount")
        og_brand = soup.find("meta", property="og:site_name")

        image_url = og_image.get("content") if og_image else None

        # Fallback: largest img src
        if not image_url:
            imgs = soup.find_all("img", src=True)
            if imgs:
                image_url = imgs[0].get("src")

        if not image_url:
            return None

        # Normalize relative URLs
        if image_url.startswith("//"):
            image_url = "https:" + image_url

        return {
            "image_url": image_url,
            "product_name": og_title.get("content") if og_title else None,
            "price": float(og_price.get("content")) if og_price else None,
            "brand": og_brand.get("content") if og_brand else None,
        }

    except Exception as e:
        logger.warning("Failed to fetch product page", url=url, error=str(e))
        return None


async def _download_image(image_url: str) -> Optional[bytes]:
    """Download an image URL and return raw bytes."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
            "Referer": "https://www.asos.com/",
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=headers) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            return response.content
    except Exception as e:
        logger.warning("Failed to download image", url=image_url, error=str(e))
        return None


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