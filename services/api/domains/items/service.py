"""Items Domain — Service Layer"""

import asyncpg
from typing import Optional
from urllib.parse import urlparse

from core.logging.logger import get_logger

logger = get_logger(__name__)


class ItemsService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_from_url(self, user_id: str, url: str) -> dict:
        """
        Create an item record from a product URL.
        - Extracts domain
        - Looks up merchant → gets affiliate network + wraps URL
        - Inserts item with status='processing'
        Returns the raw dict (will be processed async)
        """
        domain = urlparse(url).netloc.replace("www.", "")

        # Look up merchant for affiliate URL wrapping
        merchant = await self.conn.fetchrow(
            "SELECT id, name, network, program_id, affiliate_id FROM merchants WHERE domain = $1 AND is_active = TRUE",
            domain,
        )

        affiliate_url = self._wrap_affiliate_url(url, merchant) if merchant else url

        row = await self.conn.fetchrow(
            """
            INSERT INTO items (user_id, original_url, affiliate_url, merchant_id, status)
            VALUES ($1, $2, $3, $4, 'processing')
            RETURNING id, user_id, original_url, affiliate_url, processed_image_url,
                      product_name, price, currency, category, brand, status, created_at,
                      linked_url, linked_title, linked_description, linked_image_url
            """,
            user_id,
            url,
            affiliate_url,
            merchant["id"] if merchant else None,
        )

        result = dict(row)
        result["merchant"] = merchant["name"] if merchant else domain
        return result

    def _wrap_affiliate_url(self, url: str, merchant: dict) -> str:
        """
        Wrap a product URL with the appropriate affiliate network redirect.
        """
        from urllib.parse import quote
        network = merchant.get("network", "direct")

        if network == "shareasale":
            return (
                f"https://shareasale.com/r.cfm"
                f"?b={merchant['program_id']}"
                f"&u={merchant['affiliate_id']}"
                f"&urllink={quote(url)}"
            )
        elif network == "cj":
            return (
                f"https://www.anrdoezrs.net/click-{merchant['affiliate_id']}-{merchant['program_id']}"
                f"?url={quote(url)}"
            )
        elif network == "amazon":
            separator = "&" if "?" in url else "?"
            return f"{url}{separator}tag={merchant['affiliate_id']}"
        else:
            return url

    async def list_items(self, user_id: str) -> list[dict]:
        rows = await self.conn.fetch(
            """
            SELECT i.id, i.user_id, i.original_url, i.affiliate_url,
                   i.processed_image_url, i.product_name, i.price, i.currency,
                   i.category, i.brand, i.status, i.created_at,
                   i.linked_url, i.linked_title, i.linked_description, i.linked_image_url,
                   m.name AS merchant
            FROM items i
            LEFT JOIN merchants m ON m.id = i.merchant_id
            WHERE i.user_id = $1 AND i.deleted_at IS NULL
            ORDER BY i.created_at DESC
            LIMIT 200
            """,
            user_id,
        )
        return [dict(r) for r in rows]

    async def list_unpublished_items(self, user_id: str) -> list[dict]:
        """Get items that are not part of any published public set."""
        rows = await self.conn.fetch(
            """
            SELECT i.id, i.user_id, i.original_url, i.affiliate_url,
                   i.processed_image_url, i.product_name, i.price, i.currency,
                   i.category, i.brand, i.status, i.created_at,
                   i.linked_url, i.linked_title, i.linked_description, i.linked_image_url,
                   m.name AS merchant
            FROM items i
            LEFT JOIN merchants m ON m.id = i.merchant_id
            WHERE i.user_id = $1
              AND i.deleted_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM set_items si
                  JOIN sets s ON s.id = si.set_id
                  WHERE si.item_id = i.id
                    AND s.is_published = TRUE
                    AND s.privacy = 'public'
                    AND s.deleted_at IS NULL
              )
            ORDER BY i.created_at DESC
            LIMIT 200
            """,
            user_id,
        )
        return [dict(r) for r in rows]

    async def get_item(self, item_id: str, user_id: str) -> Optional[dict]:
        row = await self.conn.fetchrow(
            """
            SELECT i.*,
                   m.name AS merchant
            FROM items i
            LEFT JOIN merchants m ON m.id = i.merchant_id
            WHERE i.id = $1 AND i.user_id = $2 AND i.deleted_at IS NULL
            """,
            item_id, user_id,
        )
        return dict(row) if row else None

    async def update_link(self, item_id: str, user_id: str, linked_url: str,
                          linked_title: str, linked_description: Optional[str],
                          linked_image_url: Optional[str]) -> Optional[dict]:
        """Update the manually-linked URL info on an item."""
        row = await self.conn.fetchrow(
            """
            UPDATE items
            SET linked_url = $3,
                linked_title = $4,
                linked_description = $5,
                linked_image_url = $6,
                updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING id, user_id, original_url, affiliate_url, processed_image_url,
                      product_name, price, currency, category, brand, status, created_at,
                      linked_url, linked_title, linked_description, linked_image_url
            """,
            item_id, user_id,
            linked_url, linked_title, linked_description, linked_image_url,
        )
        if not row:
            return None
        result = dict(row)
        merchant = await self.conn.fetchrow(
            "SELECT name FROM merchants WHERE id = (SELECT merchant_id FROM items WHERE id = $1)",
            item_id,
        )
        result["merchant"] = merchant["name"] if merchant else None
        return result

    async def delete_item(self, item_id: str, user_id: str) -> None:
        await self.conn.execute(
            "UPDATE items SET deleted_at = NOW() WHERE id = $1 AND user_id = $2",
            item_id, user_id,
        )