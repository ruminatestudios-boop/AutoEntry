"""
Omnichannel sync: push master profile to Shopify, Amazon SP-API, TikTok Shop, Depop.
Uses IntegrationsManager for channel-specific copy (TikTok <500 chars, Amazon bullets, Shopify meta).
Celery + Redis; OAuth with token refresh where supported.
"""
import json

import httpx
from celery import Celery

from app.config import get_settings
from app.db import get_supabase, get_product, upsert_channel_adapter, insert_channel_push_snapshot
from app.db import list_shopify_stores, get_valid_shopify_access_token
from app.services.integrations_manager import IntegrationsManager, CHANNEL_SHOPIFY, CHANNEL_AMAZON, CHANNEL_TIKTOK_SHOP, CHANNEL_DEPOP

settings = get_settings()
celery_app = Celery(
    "auralink",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.sync_tasks", "app.tasks.feedback_tasks"],
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]

# Weekly feedback moat: correlate Shopify orders to AI description style
celery_app.conf.beat_schedule = {
    "feedback-moat-weekly-shopify": {
        "task": "app.tasks.feedback_tasks.fetch_shopify_orders_and_update_performance_logs",
        "schedule": 604800.0,  # 7 days in seconds
        "options": {"queue": "celery"},
    },
}
celery_app.conf.timezone = "UTC"


@celery_app.task(bind=True, max_retries=3)
def sync_to_shopify(self, product_id: str, shop_domain: str, access_token: str, as_draft: bool = False):
    """
    Push to Shopify via GraphQL productCreate.
    Uses IntegrationsManager for meta/SEO-focused copy (SHOPIFY_META variation or master).
    If as_draft=True, product is created as DRAFT so seller can review on Shopify and push live.
    """
    supabase = get_supabase()
    if not supabase:
        return {"channel": "shopify", "external_id": None, "status": "error", "error": "Database not configured"}
    product, variation_by_type = IntegrationsManager.load_product_and_variations(supabase, product_id)
    if not product:
        return {"channel": "shopify", "external_id": None, "status": "error", "error": "Product not found"}
    copy = IntegrationsManager.adapt(product, CHANNEL_SHOPIFY, variation_by_type)
    title = copy.title[:255]
    desc = copy.description
    vendor = (copy.vendor or "")[:255]
    tags_list = [str(t)[:255] for t in (copy.tags or [])[:250]]
    product_input = {"title": title, "descriptionHtml": desc}
    if as_draft:
        product_input["status"] = "DRAFT"
    if vendor:
        product_input["vendor"] = vendor
    if tags_list:
        product_input["tags"] = tags_list
    mutation = """
    mutation productCreate($product: ProductCreateInput!) {
      productCreate(product: $product) {
        userErrors { field message }
        product { id }
      }
    }
    """
    url = f"https://{shop_domain}/admin/api/2024-01/graphql.json"
    with httpx.Client() as client:
        r = client.post(
            url,
            json={"query": mutation, "variables": {"product": product_input}},
            headers={
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": access_token,
            },
        )
    if r.status_code != 200:
        return {"channel": "shopify", "external_id": None, "status": "error", "error": f"HTTP {r.status_code}: {r.text}"}
    data = r.json()
    errs = (data.get("data") or {}).get("productCreate", {}).get("userErrors") or []
    if errs:
        return {"channel": "shopify", "external_id": None, "status": "error", "error": "; ".join(e.get("message", "") for e in errs)}
    gid = (data.get("data") or {}).get("productCreate", {}).get("product", {}).get("id")
    if not gid:
        return {"channel": "shopify", "external_id": None, "status": "error", "error": "No product ID in response"}
    upsert_channel_adapter(supabase, product_id, "shopify", gid)
    # Record which variation was pushed for feedback moat (default: SHOPIFY_META / fact_feel_proof_v1)
    try:
        insert_channel_push_snapshot(
            supabase,
            product_id=product_id,
            channel="shopify",
            external_id=gid,
            variation_type="SHOPIFY_META",
            ai_prompt_version="fact_feel_proof_v1",
        )
    except Exception:
        pass
    return {"channel": "shopify", "external_id": gid, "status": "synced"}


@celery_app.task(bind=True, max_retries=3)
def sync_to_amazon(self, product_id: str, marketplace: str, credentials: dict):
    """
    Map master profile to Amazon SP-API (Catalog Items / Listings).
    Uses IntegrationsManager for bullet-focused copy (AMAZON_BULLETS variation or master).
    """
    supabase = get_supabase()
    if not supabase:
        return {"channel": "amazon", "external_id": None, "status": "error", "error": "Database not configured"}
    product, variation_by_type = IntegrationsManager.load_product_and_variations(supabase, product_id)
    if not product:
        return {"channel": "amazon", "external_id": None, "status": "error", "error": "Product not found"}
    copy = IntegrationsManager.adapt(product, CHANNEL_AMAZON, variation_by_type)
    # TODO: Implement Amazon SP-API list item / patch using copy.title, copy.description, copy.bullets
    # credentials: refresh_token, lwa_app_id, lwa_client_secret, etc.
    return {"channel": "amazon", "external_id": None, "status": "pending_impl", "adapted_title": copy.title[:80]}


@celery_app.task(bind=True, max_retries=3)
def sync_to_tiktok_shop(self, product_id: str, seller_credentials: dict):
    """
    Push to TikTok Shop. Uses IntegrationsManager for ≤500-char description (TIKTOK_VIRAL or truncated).
    """
    supabase = get_supabase()
    if not supabase:
        return {"channel": "tiktok_shop", "external_id": None, "status": "error", "error": "Database not configured"}
    product, variation_by_type = IntegrationsManager.load_product_and_variations(supabase, product_id)
    if not product:
        return {"channel": "tiktok_shop", "external_id": None, "status": "error", "error": "Product not found"}
    copy = IntegrationsManager.adapt(product, CHANNEL_TIKTOK_SHOP, variation_by_type)
    # TODO: Implement TikTok Shop API create/update product with copy.title, copy.description (≤500 chars)
    return {"channel": "tiktok_shop", "external_id": None, "status": "pending_impl", "adapted_description_len": len(copy.description)}


@celery_app.task(bind=True, max_retries=3)
def sync_to_depop(self, product_id: str, seller_token: str):
    """
    Format "Photo + Description" for Depop-style marketplaces.
    Uses IntegrationsManager (SHOPIFY_META-style copy).
    """
    supabase = get_supabase()
    if not supabase:
        return {"channel": "depop", "external_id": None, "status": "error", "error": "Database not configured"}
    product, variation_by_type = IntegrationsManager.load_product_and_variations(supabase, product_id)
    if not product:
        return {"channel": "depop", "external_id": None, "status": "error", "error": "Product not found"}
    copy = IntegrationsManager.adapt(product, CHANNEL_DEPOP, variation_by_type)
    # TODO: Implement Depop API or generate CSV with copy.title, copy.description
    return {"channel": "depop", "external_id": None, "status": "pending_impl"}


@celery_app.task(bind=True, max_retries=2)
def publish_listing_to_channels(self, product_id: str):
    """
    Event-driven: on "listing published", push to all connected channels.
    Queues sync_to_shopify for each connected Shopify store; other channels when configured.
    """
    supabase = get_supabase()
    if not supabase:
        return {"status": "error", "error": "Database not configured", "queued": []}
    product = get_product(supabase, product_id)
    if not product:
        return {"status": "error", "error": "Product not found", "queued": []}
    queued = []
    stores = list_shopify_stores(supabase)
    for store in stores:
        shop_domain = store.get("shop_domain")
        if not shop_domain:
            continue
        access_token, err = get_valid_shopify_access_token(supabase, shop_domain)
        if err or not access_token:
            continue
        t = sync_to_shopify.delay(product_id, shop_domain, access_token)
        queued.append({"channel": "shopify", "shop_domain": shop_domain, "task_id": t.id})
    return {"status": "ok", "product_id": product_id, "queued": queued}
