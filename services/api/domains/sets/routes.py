"""Sets Domain — Routes"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from asyncpg import Connection
from typing import Optional

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user, get_optional_user
from domains.sets.schemas import (
    SetCreateSchema, SetUpdateSchema, SetResponseSchema, SetFeedSchema,
    SetPrivacyUpdateSchema, LikeToggleResponse,
)
from domains.sets.service import SetsService

router = APIRouter()


@router.get("/feed", response_model=list[SetFeedSchema])
async def get_feed(
    aesthetic: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    following: bool = Query(False),
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    viewer=Depends(get_optional_user),
    conn: Connection = Depends(get_conn),
):
    service = SetsService(conn)
    return await service.get_feed(
        viewer_id=viewer["id"] if viewer else None,
        offset=offset,
        aesthetic=aesthetic,
        user_id=user_id,
        limit=limit,
        following=following,
    )


@router.get("/featured", response_model=list[SetFeedSchema])
async def get_featured_sets(conn: Connection = Depends(get_conn)):
    service = SetsService(conn)
    return await service.get_featured(limit=12)


@router.get("/related/{set_id}", response_model=list[SetFeedSchema])
async def get_related_sets(set_id: str, conn: Connection = Depends(get_conn)):
    service = SetsService(conn)
    return await service.get_related(set_id=set_id, limit=6)


@router.post("", response_model=SetResponseSchema, status_code=201)
async def create_set(
    body: SetCreateSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = SetsService(conn)
    return await service.create_set(user_id=current_user["id"], data=body)


# ── Private sets (MUST come before /{set_id} to avoid route conflict) ──────

@router.get("/private")
async def get_private_sets(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Get sets that are published but private."""
    service = SetsService(conn)
    return await service.get_private_sets(user_id=current_user["id"])


@router.get("/drafts")
async def get_draft_sets(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Get sets that are saved but not published (drafts)."""
    service = SetsService(conn)
    return await service.get_draft_sets(user_id=current_user["id"])


# ── Single set routes ─────────────────────────────────────────────────────

@router.get("/{set_id}", response_model=SetResponseSchema)
async def get_set(
    set_id: str,
    viewer=Depends(get_optional_user),
    session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    conn: Connection = Depends(get_conn),
):
    service = SetsService(conn)
    set_data = await service.get_set(
        set_id=set_id,
        viewer_id=viewer["id"] if viewer else None,
        session_id=session_id,
    )
    if not set_data:
        raise HTTPException(status_code=404, detail="Set not found")
    return set_data


@router.get("/{set_id}/items")
async def get_set_items(set_id: str, conn: Connection = Depends(get_conn)):
    """Get all items in a set with affiliate URLs and linked item data for the shop list."""
    rows = await conn.fetch(
        """
        SELECT i.id, i.product_name, i.processed_image_url, i.price, i.currency,
               i.affiliate_url, i.original_url, i.brand,
               i.linked_url, i.linked_title, i.linked_description, i.linked_image_url,
               m.name AS merchant
        FROM set_items si
        JOIN items i ON i.id = si.item_id
        LEFT JOIN merchants m ON m.id = i.merchant_id
        WHERE si.set_id = $1 AND i.deleted_at IS NULL
        ORDER BY si.display_order
        """,
        set_id,
    )
    return [dict(r) for r in rows]


@router.patch("/{set_id}", response_model=SetResponseSchema)
async def update_set(
    set_id: str,
    body: SetUpdateSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = SetsService(conn)
    return await service.update_set(set_id=set_id, user_id=current_user["id"], data=body)


@router.patch("/{set_id}/privacy")
async def toggle_set_privacy(
    set_id: str,
    body: SetPrivacyUpdateSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Toggle a set's privacy between 'public' and 'private'."""
    if body.privacy not in ("public", "private"):
        raise HTTPException(status_code=400, detail="privacy must be 'public' or 'private'")
    service = SetsService(conn)
    result = await service.toggle_privacy(
        set_id=set_id, user_id=current_user["id"], privacy=body.privacy
    )
    if not result:
        raise HTTPException(status_code=404, detail="Set not found")
    return result


@router.post("/{set_id}/like", response_model=LikeToggleResponse)
async def like_set(
    set_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = SetsService(conn)
    return await service.toggle_like(set_id=set_id, user_id=current_user["id"])


@router.post("/{set_id}/remix", response_model=SetResponseSchema, status_code=201)
async def remix_set(
    set_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = SetsService(conn)
    return await service.remix(set_id=set_id, remixer_id=current_user["id"])


@router.post("/{set_id}/edit", response_model=SetResponseSchema, status_code=201)
async def edit_set_as_remix(
    set_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """
    Clone a published set for editing by another user.
    Creates new items in the editor's library and updates canvas_json with new item IDs.
    """
    service = SetsService(conn)
    return await service.edit_set_for_user(set_id=set_id, editor_id=current_user["id"])


@router.get("/{set_id}/edits")
async def get_set_edits(
    set_id: str,
    conn: Connection = Depends(get_conn),
):
    """Get all published sets that were edited from this original set."""
    rows = await conn.fetch(
        """
        SELECT s.id, s.title, s.thumbnail_url, s.like_count, s.created_at,
               u.id AS creator_id, u.username AS creator_username,
               u.avatar_url AS creator_avatar_url
        FROM sets s
        JOIN users u ON u.id = s.user_id
        WHERE s.parent_set_id = $1
          AND s.deleted_at IS NULL
          AND s.is_published = TRUE
        ORDER BY s.created_at DESC
        LIMIT 20
        """,
        set_id,
    )
    return [
        {
            "id": str(r["id"]),
            "title": r["title"],
            "thumbnail_url": r["thumbnail_url"],
            "like_count": r["like_count"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "creator": {
                "id": str(r["creator_id"]),
                "username": r["creator_username"],
                "avatar_url": r["creator_avatar_url"],
            },
        }
        for r in rows
    ]