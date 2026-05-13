"""
Items Domain — Routes
URL clipping, image upload, item library management.
"""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, UploadFile, File
from asyncpg import Connection
import io

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user
from core.storage.r2 import upload_to_r2
from domains.items.schemas import ItemClipSchema, ItemResponseSchema, ItemLinkUpdateSchema
from domains.items.service import ItemsService
from domains.items import processor

router = APIRouter()


@router.post("/clip", response_model=ItemResponseSchema, status_code=201)
async def clip_item(
    body: ItemClipSchema,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Clip an item from a product URL. Returns immediately, processes in background."""
    service = ItemsService(conn)
    item = await service.create_from_url(user_id=current_user["id"], url=str(body.url))
    background_tasks.add_task(processor.process_item, item_id=item["id"], url=str(body.url))
    return item


@router.post("/upload", response_model=ItemResponseSchema, status_code=201)
async def upload_item(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Upload an image directly (vintage/thrifted items with no product URL)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    image_bytes = await file.read()

    service = ItemsService(conn)
    row = await conn.fetchrow(
        """
        INSERT INTO items (user_id, status)
        VALUES ($1, 'processing')
        RETURNING id, user_id, original_url, affiliate_url, processed_image_url,
                  product_name, price, currency, category, brand, status, created_at,
                  linked_url, linked_title, linked_description, linked_image_url
        """,
        current_user["id"],
    )
    item = dict(row)
    item["merchant"] = None

    background_tasks.add_task(
        processor.process_uploaded_image,
        item_id=item["id"],
        image_bytes=image_bytes,
    )
    return item


@router.get("", response_model=list[ItemResponseSchema])
async def list_items(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = ItemsService(conn)
    return await service.list_items(user_id=current_user["id"])


# ── Unpublished items (MUST come before /{item_id} to avoid route conflict) ─

@router.get("/unpublished")
async def list_unpublished_items(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Get items not used in any published public set."""
    service = ItemsService(conn)
    return await service.list_unpublished_items(user_id=current_user["id"])


@router.get("/{item_id}", response_model=ItemResponseSchema)
async def get_item(
    item_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = ItemsService(conn)
    item = await service.get_item(item_id=item_id, user_id=current_user["id"])
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.patch("/{item_id}/link", response_model=ItemResponseSchema)
async def update_item_link(
    item_id: str,
    body: ItemLinkUpdateSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Update the manually-linked URL and metadata on an item."""
    service = ItemsService(conn)
    item = await service.update_link(
        item_id=item_id,
        user_id=current_user["id"],
        linked_url=body.linked_url,
        linked_title=body.linked_title,
        linked_description=body.linked_description,
        linked_image_url=body.linked_image_url,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_item(
    item_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = ItemsService(conn)
    await service.delete_item(item_id=item_id, user_id=current_user["id"])