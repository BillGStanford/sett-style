"""
Analytics Domain — Routes

CONSENT-BASED ANALYTICS

What we track and why:
  - page_view: which pages users visit → understand funnel drop-off
  - set_view: which sets are viewed → power recommendation algorithm
  - item_clip: when users clip items → understand acquisition intent
  - canvas_publish: when sets are published → measure creation funnel
  - affiliate_click: tracked in commerce domain (revenue critical)
  - search_query: what users search for → improve Meilisearch index

What we DO NOT track:
  - Precise location (city-level max, never street-level)
  - Device fingerprinting
  - Cross-site tracking
  - Any PII beyond what's in the users table

Where consent is handled:
  - Onboarding: analytics opt-in checkbox (default: opted IN for product analytics,
    opted OUT for marketing analytics)
  - Settings > Privacy: full control to disable all tracking
  - Cookie banner: shown on first visit, consent stored in users.analytics_consent

Compliance:
  - GDPR: consent required for EU users. Data deletion on account deletion.
  - CCPA: opt-out mechanism in settings
  - COPPA: no tracking for users under 13 (blocked at registration)

Storage:
  - Product analytics: PostHog (self-hosted on Railway)
  - Revenue analytics: raw affiliate_clicks table (PostgreSQL)
  - Future: ClickHouse for high-volume event storage at 10M+ events/day
"""

from fastapi import APIRouter, Depends, Request
from asyncpg import Connection
from pydantic import BaseModel
from typing import Optional

from core.database.connection import get_conn
from core.auth.dependencies import get_optional_user

router = APIRouter()


class EventSchema(BaseModel):
    event: str          # 'page_view', 'set_view', 'canvas_publish', etc.
    properties: dict = {}


@router.post("/event", status_code=204)
async def track_event(
    body: EventSchema,
    request: Request,
    viewer=Depends(get_optional_user),
    conn: Connection = Depends(get_conn),
):
    """
    Client-side event tracking endpoint.

    Called from the frontend for product analytics events.
    Events are forwarded to PostHog (self-hosted) for funnel analysis.

    Before forwarding, we check:
      1. User has consented to analytics (users.analytics_consent = TRUE)
      2. Event is in our allowlist (no arbitrary event flooding)

    TODO: Forward to PostHog via posthog-python SDK
    TODO: Check user consent before recording
    """
    allowed_events = {
        "page_view", "set_view", "item_clip", "canvas_open",
        "canvas_publish", "search_query", "follow", "challenge_view",
    }

    if body.event not in allowed_events:
        return  # Silently ignore unknown events

    # TODO: posthog.capture(
    #     distinct_id=viewer["id"] if viewer else "anonymous",
    #     event=body.event,
    #     properties={**body.properties, "ip": request.client.host}
    # )
    pass


@router.get("/creator/{user_id}/stats")
async def get_creator_stats(
    user_id: str,
    viewer=Depends(get_optional_user),
    conn: Connection = Depends(get_conn),
):
    """
    Public creator stats (follower count, total likes, sets published).
    More detailed stats available in commerce/earnings for the authenticated creator.
    """
    row = await conn.fetchrow(
        """
        SELECT
            (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers,
            (SELECT COUNT(*) FROM sets WHERE user_id = u.id AND is_published = TRUE AND deleted_at IS NULL) AS sets_count,
            (SELECT COALESCE(SUM(like_count), 0) FROM sets WHERE user_id = u.id AND is_published = TRUE) AS total_likes
        FROM users u
        WHERE u.id = $1 AND u.deleted_at IS NULL
        """,
        user_id,
    )
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "followers": int(row["followers"]),
        "sets_count": int(row["sets_count"]),
        "total_likes": int(row["total_likes"]),
    }
