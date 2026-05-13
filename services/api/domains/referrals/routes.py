"""
Referrals Domain — Routes

Creator referral system drives organic user acquisition.

How it works:
  1. Every creator has a unique referral_code (generated at registration)
  2. Creator shares: sett.style/ref/{code} or sett.style/?ref={code}
  3. New user clicks link → referral_code stored in cookie (30-day window)
  4. When new user registers → referred_by FK set on their user row
  5. For 30 days after registration: referred user's affiliate activity
     generates a 10% BONUS commission for the referring creator

Example:
  Creator earns 70% normally.
  Referred user clicks a product, sale converts ($7.80 commission).
  Referring creator gets: 70% × $7.80 = $5.46 (normal share)
  PLUS referred user's creator gets $5.46 too, AND:
  Referring creator gets 10% BONUS of the referred user's activity.

Attribution window: 30 days from registration.
This is tracked via referrals table: share_expiry_date.

Anti-abuse:
  - One referral code per user
  - Self-referral blocked (backend check)
  - Bonus applies to organic affiliate activity only (not manufactured clicks)
  - Minimum payout threshold applies to bonus commissions too

Future:
  - Multi-tier referrals (level 2, level 3) for power creators
  - Referral leaderboard (public, opt-in)
  - Cash bonus at milestones (e.g., $10 when referred user earns first $1)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from asyncpg import Connection

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/my-code")
async def get_my_referral_code(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Get the authenticated user's referral code and basic stats."""
    row = await conn.fetchrow(
        """
        SELECT referral_code,
               (SELECT COUNT(*) FROM users WHERE referred_by = $1) AS total_referred,
               (SELECT COUNT(*) FROM users WHERE referred_by = $1
                AND created_at > NOW() - INTERVAL '30 days') AS referred_this_month
        FROM users WHERE id = $1
        """,
        current_user["id"],
    )

    return {
        "code": row["referral_code"],
        "share_url": f"https://sett.style/ref/{row['referral_code']}",
        "direct_url": f"https://sett.style/?ref={row['referral_code']}",
        "total_referred": int(row["total_referred"]),
        "referred_this_month": int(row["referred_this_month"]),
        "bonus_pct": 10,
        "window_days": 30,
    }


@router.get("/stats")
async def get_referral_stats(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """Get detailed referral statistics including earnings."""
    user_id = current_user["id"]
    
    # Basic counts
    counts = await conn.fetchrow(
        """
        SELECT 
            (SELECT COUNT(*) FROM users WHERE referred_by = $1) AS total_referred,
            (SELECT COUNT(*) FROM users WHERE referred_by = $1
                AND created_at > NOW() - INTERVAL '7 days') AS referred_this_week,
            (SELECT COUNT(*) FROM users WHERE referred_by = $1
                AND created_at > NOW() - INTERVAL '30 days') AS referred_this_month
        """,
        user_id,
    )
    
    # Earnings from referral bonus (uses earned_at, NOT created_at)
    earnings = await conn.fetchrow(
        """
        SELECT 
            COALESCE(SUM(commission_bonus), 0) AS total_bonus_earned,
            COALESCE(SUM(CASE WHEN earned_at > NOW() - INTERVAL '30 days' THEN commission_bonus ELSE 0 END), 0) AS bonus_this_month
        FROM referral_commissions
        WHERE referrer_id = $1
        """,
        user_id,
    )
    
    # Active referred users (those who have created at least one set)
    active_count = await conn.fetchval(
        """
        SELECT COUNT(DISTINCT u.id)
        FROM users u
        JOIN sets s ON s.user_id = u.id AND s.is_published = TRUE
        WHERE u.referred_by = $1
        """,
        user_id,
    )
    
    return {
        "total_referred": int(counts["total_referred"]),
        "referred_this_week": int(counts["referred_this_week"]),
        "referred_this_month": int(counts["referred_this_month"]),
        "active_referred_users": int(active_count),
        "total_bonus_earned": float(earnings["total_bonus_earned"]),
        "bonus_this_month": float(earnings["bonus_this_month"]),
        "bonus_rate": 10,
        "attribution_window_days": 30,
    }


@router.get("/referred-users")
async def get_referred_users(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0, ge=0),
):
    """Get list of users referred by the current user."""
    rows = await conn.fetch(
        """
        SELECT 
            u.id,
            u.username,
            u.avatar_url,
            u.created_at,
            (SELECT COUNT(*) FROM sets WHERE user_id = u.id AND is_published = TRUE) AS sets_published,
            (SELECT COALESCE(SUM(commission_creator), 0) 
             FROM affiliate_clicks 
             WHERE creator_id = u.id AND converted = TRUE) AS total_earned
        FROM users u
        WHERE u.referred_by = $1 AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC
        LIMIT $2 OFFSET $3
        """,
        current_user["id"],
        limit,
        offset,
    )
    
    total = await conn.fetchval(
        "SELECT COUNT(*) FROM users WHERE referred_by = $1 AND deleted_at IS NULL",
        current_user["id"],
    )
    
    return {
        "users": [
            {
                "id": str(row["id"]),
                "username": row["username"],
                "avatar_url": row["avatar_url"],
                "joined_at": row["created_at"].isoformat(),
                "sets_published": int(row["sets_published"]),
                "total_earned": float(row["total_earned"]),
            }
            for row in rows
        ],
        "total": int(total),
        "limit": limit,
        "offset": offset,
    }


@router.post("/apply/{code}")
async def apply_referral_code(
    code: str,
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """
    Apply a referral code to an existing account.
    Can only be applied once, within 7 days of registration.
    """
    # Validate: user hasn't already been referred
    user = await conn.fetchrow(
        "SELECT referred_by, created_at FROM users WHERE id = $1", current_user["id"]
    )
    if user["referred_by"]:
        raise HTTPException(status_code=400, detail="Referral already applied")

    # Check 7-day window
    if (user["created_at"] - __import__('datetime').datetime.utcnow()).days < -7:
        raise HTTPException(status_code=400, detail="Referral code must be applied within 7 days of registration")

    # Find referrer
    referrer = await conn.fetchrow(
        "SELECT id FROM users WHERE referral_code = $1 AND deleted_at IS NULL", code
    )
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if str(referrer["id"]) == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")

    await conn.execute(
        "UPDATE users SET referred_by = $1 WHERE id = $2",
        referrer["id"], current_user["id"],
    )

    return {"status": "applied", "bonus_active_days": 30}