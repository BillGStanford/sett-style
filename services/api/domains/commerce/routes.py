"""Commerce Domain — Routes"""

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from fastapi.responses import RedirectResponse
from asyncpg import Connection
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from core.database.connection import get_conn
from core.auth.dependencies import get_current_user, get_optional_user
from domains.commerce.service import CommerceService

router = APIRouter()


@router.get("/click/{item_id}")
async def track_click_and_redirect(
    item_id: str,
    request: Request,
    set_id: Optional[str] = Query(None),
    viewer=Depends(get_optional_user),
    conn: Connection = Depends(get_conn),
):
    """Track affiliate click and 302 redirect to affiliate URL."""
    service = CommerceService(conn)
    affiliate_url = await service.get_affiliate_url(item_id)
    if not affiliate_url:
        raise HTTPException(status_code=404, detail="Item not found")

    attribution = await service.record_click(
        item_id=item_id,
        set_id=set_id,
        clicker_id=viewer["id"] if viewer else None,
        referrer=str(request.headers.get("referer", ""))[:500],
        user_agent=str(request.headers.get("user-agent", ""))[:300],
    )

    # Carry our click reference through affiliate networks that support sub-IDs.
    # The corresponding network webhook must return this field for attribution.
    parts = urlsplit(affiliate_url)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        raise HTTPException(status_code=502, detail="Affiliate destination is invalid")
    network = attribution["network"]
    tracking_key = {"shareasale": "afftrack", "cj": "sid"}.get(network, "sett_click")
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query[tracking_key] = attribution["click_ref"]
    tracked_url = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return RedirectResponse(url=tracked_url, status_code=302)


@router.post("/webhook/shareasale")
async def shareasale_webhook(request: Request, conn: Connection = Depends(get_conn)):
    service = CommerceService(conn)
    body = await request.json()
    await service.process_conversion(
        network="shareasale",
        click_ref=body.get("click_ref") or body.get("afftrack") or body.get("subId") or body.get("transactionId"),
        order_value=float(body.get("saleAmount", 0)),
        commission_gross=float(body.get("commissionAmount", 0)),
    )
    return {"status": "ok"}


@router.post("/webhook/cj")
async def cj_webhook(request: Request, conn: Connection = Depends(get_conn)):
    service = CommerceService(conn)
    body = await request.json()
    await service.process_conversion(
        network="cj",
        click_ref=body.get("click_ref") or body.get("sid") or body.get("subId") or body.get("orderId"),
        order_value=float(body.get("orderAmount", 0)),
        commission_gross=float(body.get("commissionAmount", 0)),
    )
    return {"status": "ok"}


@router.get("/earnings")
async def get_earnings(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = CommerceService(conn)
    return await service.get_creator_earnings(user_id=current_user["id"])


@router.post("/payouts/request")
async def request_payout(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    service = CommerceService(conn)
    return await service.request_payout(user_id=current_user["id"])


# ── Pro Subscription ──────────────────────────────────────────────────────────

@router.post("/subscribe/pro")
async def create_pro_checkout(
    current_user=Depends(get_current_user),
    conn: Connection = Depends(get_conn),
):
    """
    Create a Stripe Checkout session for Pro subscription ($9.99/mo).

    To activate:
    1. pip install stripe
    2. Add STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to .env
    3. Create a Product in Stripe Dashboard → $9.99/month recurring
    4. Copy the Price ID (price_xxx) into .env as STRIPE_PRO_PRICE_ID

    The webhook at /commerce/webhook/stripe handles subscription activation.
    """
    try:
        import stripe
        from core.config.settings import settings
        stripe.api_key = getattr(settings, 'stripe_secret_key', '')
        if not stripe.api_key:
            raise HTTPException(status_code=503, detail="Stripe not configured")

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price": getattr(settings, 'stripe_pro_price_id', ''),
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"https://sett.style/settings?upgraded=true",
            cancel_url=f"https://sett.style/settings",
            client_reference_id=current_user["id"],
            metadata={"user_id": current_user["id"]},
        )
        return {"checkout_url": session.url}
    except ImportError:
        raise HTTPException(status_code=503, detail="Stripe not installed. Run: pip install stripe")


@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    conn: Connection = Depends(get_conn),
):
    """
    Stripe webhook — activates Pro plan when subscription is confirmed.
    Register this URL in Stripe Dashboard → Webhooks.
    Listen for: checkout.session.completed, customer.subscription.deleted
    """
    try:
        import stripe
        from core.config.settings import settings

        payload = await request.body()
        sig = request.headers.get("stripe-signature", "")
        webhook_secret = getattr(settings, 'stripe_webhook_secret', '')

        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig, webhook_secret)
        else:
            event = {"type": "unknown", "data": {"object": {}}}

        if event["type"] == "checkout.session.completed":
            obj = event["data"]["object"]
            user_id = obj.get("client_reference_id") or obj.get("metadata", {}).get("user_id")
            if user_id:
                # Activate Pro — set plan + expiry 30 days out
                import datetime
                expiry = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=31)
                await conn.execute(
                    "UPDATE users SET plan='pro', plan_expires_at=$1 WHERE id=$2",
                    expiry, user_id,
                )

        elif event["type"] == "customer.subscription.deleted":
            # Subscription cancelled — revert to free
            obj = event["data"]["object"]
            # Find user by Stripe customer ID (would need a stripe_customer_id column)
            # For now: handled manually or via Stripe customer portal
            pass

        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
