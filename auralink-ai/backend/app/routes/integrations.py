"""
Multi-channel orchestration API: event-driven publish and webhook for "listing published".
Uses IntegrationsManager per channel; OAuth with token refresh where supported.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import verify_clerk
from app.db import get_supabase, get_product, update_product_status
from app.demo_store import get_product_demo
from app.tasks.sync_tasks import publish_listing_to_channels

router = APIRouter()


@router.post("/publish/{product_id}", response_model=dict)
async def publish_listing(product_id: UUID, set_status: bool = True, _auth: dict = Depends(verify_clerk)):
    """
    Event-driven publish: set product to PUBLISHED (optional) and push to all connected channels.
    In demo mode (no DB), returns success message without queuing tasks.
    """
    supabase = get_supabase()
    if not supabase:
        row = get_product_demo(str(product_id))
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"status": "demo_mode", "product_id": str(product_id), "message": "No database connected. Connect Supabase and run Celery to publish to channels."}
    row = get_product(supabase, str(product_id))
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    if set_status:
        update_product_status(supabase, str(product_id), "PUBLISHED")
    task = publish_listing_to_channels.delay(str(product_id))
    return {
        "status": "queued",
        "product_id": str(product_id),
        "task_id": task.id,
        "message": "Run Celery worker to push to connected channels (Shopify, etc.).",
    }


class WebhookListingPublishedBody(BaseModel):
    product_id: str
    secret: Optional[str] = None


@router.post("/webhooks/listing-published", response_model=dict)
async def webhook_listing_published(body: WebhookListingPublishedBody):
    """
    Incoming webhook: "listing published" event. Queues push to all connected channels.
    Optionally verify via INTEGRATIONS_WEBHOOK_SECRET in env.
    """
    from app.config import get_settings
    settings = get_settings()
    webhook_secret = getattr(settings, "integrations_webhook_secret", None) or ""
    if webhook_secret and body.secret != webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    supabase = get_supabase()
    if not supabase:
        row = get_product_demo(body.product_id)
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"status": "demo_mode", "product_id": body.product_id, "message": "No database connected."}
    row = get_product(supabase, body.product_id)
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    task = publish_listing_to_channels.delay(body.product_id)
    return {"status": "queued", "product_id": body.product_id, "task_id": task.id}
