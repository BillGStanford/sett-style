"""
Challenges Domain — Routes
Weekly community challenges are the primary engagement engine.
"""

from fastapi import APIRouter, Depends
from asyncpg import Connection
from core.database.connection import get_conn

router = APIRouter()


@router.get("")
async def list_challenges(conn: Connection = Depends(get_conn)):
    """Return active and upcoming challenges."""
    rows = await conn.fetch(
        """
        SELECT id, title, theme, description, hashtag, start_date, end_date, prize_type
        FROM challenges
        WHERE is_active = TRUE AND end_date > NOW()
        ORDER BY start_date DESC
        LIMIT 10
        """
    )
    return [dict(r) for r in rows]


@router.get("/{challenge_id}")
async def get_challenge(challenge_id: str, conn: Connection = Depends(get_conn)):
    row = await conn.fetchrow(
        "SELECT * FROM challenges WHERE id = $1", challenge_id
    )
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Challenge not found")
    return dict(row)
