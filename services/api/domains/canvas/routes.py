"""
Canvas Domain — Routes

Handles canvas-specific operations separate from the sets domain:
  - Auto-save drafts
  - Load canvas state for editing
  - Generate signed R2 upload URL for thumbnail export (client-side upload)
  - Local thumbnail upload fallback (when R2 is not configured)

Why separate from sets?
  The sets domain handles the published artifact (metadata, feed, likes).
  The canvas domain handles the editing experience (state, drafts, export).
  This separation allows the canvas to evolve independently — e.g., adding
  real-time collaboration without touching the sets domain.

Canvas state storage:
  Canvas JSON is stored in sets.canvas_json (JSONB).
  For active sessions: also cached in Redis (TTL: 2 hours) for fast loading.

Auto-save contract:
  Frontend calls PATCH /canvas/{set_id}/autosave every 60 seconds.
  Returns 204. Errors are swallowed client-side (user is never blocked by autosave).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from asyncpg import Connection
from pydantic import BaseModel
from typing import Optional

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user
from core.storage.r2 import generate_presigned_upload_url

router = APIRouter()


class AutosaveSchema(BaseModel):
    canvas_json: dict
    title: Optional[str] = None


@router.get("/{set_id}")
async def load_canvas(
    set_id: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """
    Load canvas state for editing.
    Returns canvas_json + item metadata for the properties panel.
    """
    row = await conn.fetchrow(
        "SELECT id, title, canvas_json FROM sets WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
        set_id, current_user["id"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Set not found")

    return {
        "id": str(row["id"]),
        "title": row["title"],
        "canvas_json": row["canvas_json"],
    }


@router.patch("/{set_id}/autosave", status_code=204)
async def autosave_canvas(
    set_id: str,
    body: AutosaveSchema,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """
    Auto-save canvas state. Called every 60 seconds from the editor.
    Fast path: single UPDATE, no response body.
    """
    import json
    await conn.execute(
        """
        UPDATE sets
        SET canvas_json = $1,
            title = COALESCE($2, title),
            updated_at = NOW()
        WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
        """,
        json.dumps(body.canvas_json),
        body.title,
        set_id,
        current_user["id"],
    )


@router.post("/thumbnail-upload-url")
async def get_thumbnail_upload_url(
    current_user=Depends(get_current_user),
):
    """
    Generate a presigned R2 URL for direct client-side thumbnail upload.

    Flow:
      1. Canvas exports PNG client-side (Fabric.js toDataURL)
      2. Frontend requests a presigned URL from this endpoint
      3. Frontend PUTs the PNG directly to R2 (bypasses our API server)
      4. Frontend sends the resulting public URL to POST /sets

    This avoids routing large image files through our Railway instance,
    saving bandwidth and improving upload speed.

    Returns null values when R2 is not configured, signaling the frontend
    to fall back to the local upload endpoint.
    """
    from core.storage.r2 import _r2_configured

    if not _r2_configured():
        return {"upload_url": None, "public_url": None}

    from nanoid import generate as nanoid
    key = f"sets/thumbnails/{current_user['id']}/{nanoid(size=12)}.png"
    upload_url = await generate_presigned_upload_url(key=key, content_type="image/png")
    public_url = f"https://media.sett.style/{key}"

    return {"upload_url": upload_url, "public_url": public_url}


@router.post("/thumbnail")
async def upload_thumbnail_local(
    request: Request,
    file: UploadFile = File(...),
    set_id: Optional[str] = Form(None),
):
    """
    Upload canvas thumbnail locally when R2 is not configured.
    Called as a fallback by the frontend publish modal.

    Returns a full URL (http://localhost:8000/uploads/sets/{id}.png)
    so it works in both server components (SSR) and client components
    without needing the frontend to prepend the API base.
    """
    import uuid as uuid_mod

    image_bytes = await file.read()
    if len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="Image too small")

    # Use set_id as filename, or generate one
    safe_id = (set_id or str(uuid_mod.uuid4())).replace("/", "").replace("\\", "").replace("..", "")

    # Path: sett/uploads/sets/{id}.png
    from pathlib import Path
    uploads_dir = (
        Path(__file__).resolve().parent.parent.parent.parent.parent
        / "uploads" / "sets"
    )
    uploads_dir.mkdir(parents=True, exist_ok=True)

    filepath = uploads_dir / f"{safe_id}.png"
    filepath.write_bytes(image_bytes)

    # Return FULL URL so <img src> works everywhere without prefix logic
    full_url = str(request.base_url) + f"uploads/sets/{safe_id}.png"
    return {"url": full_url}