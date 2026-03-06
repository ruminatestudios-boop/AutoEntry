"""
Feedback Moat: correlate Shopify (and other) sales to AI description style.
Weekly worker fetches orders from Shopify Admin API, joins to channel_push_snapshots
and description_variations, upserts into performance_logs.
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx

from app.db import (
    get_supabase,
    list_shopify_stores,
    get_channel_adapter_by_external_id,
    get_channel_push_snapshot,
    upsert_performance_log,
)

# Use the same Celery app as sync_tasks so Beat and workers see all tasks
from app.tasks.sync_tasks import celery_app


def _shopify_product_gid(legacy_product_id: int) -> str:
    """Build Shopify Product GID from REST API numeric product_id."""
    return f"gid://shopify/Product/{legacy_product_id}"


def _fetch_shopify_orders(shop_domain: str, access_token: str, created_min: str, created_max: str) -> list:
    """Fetch orders from Shopify REST Admin API for the given date range."""
    url = f"https://{shop_domain}/admin/api/2024-01/orders.json"
    all_orders = []
    params = {
        "status": "any",
        "created_at_min": created_min,
        "created_at_max": created_max,
        "limit": 250,
    }
    with httpx.Client(timeout=30.0) as client:
        while True:
            r = client.get(
                url,
                params=params,
                headers={"X-Shopify-Access-Token": access_token},
            )
            if r.status_code != 200:
                break
            data = r.json()
            orders = data.get("orders") or []
            if not orders:
                break
            all_orders.extend(orders)
            if len(orders) < 250:
                break
            # Cursor-style: use last order created_at as next min (API uses created_at_min inclusive)
            params["created_at_min"] = orders[-1].get("created_at") or params["created_at_min"]
            params["limit"] = 250
    return all_orders


def _aggregate_orders_to_performance(
    orders: list,
    supabase,
) -> dict:
    """
    Map each order's line_items to our product_id via channel_adapters,
    then to variation_type/ai_prompt_version via channel_push_snapshots.
    Returns dict keyed by (product_id, variation_type, ai_prompt_version) with
    orders_count and revenue_cents.
    """
    agg = defaultdict(lambda: {"orders_count": 0, "revenue_cents": 0})
    for order in orders:
        line_items = order.get("line_items") or []
        for item in line_items:
            product_id_legacy = item.get("product_id")
            if not product_id_legacy:
                continue
            gid = _shopify_product_gid(product_id_legacy)
            adapter = get_channel_adapter_by_external_id(supabase, "shopify", gid)
            if not adapter:
                continue
            our_product_id = adapter.get("product_id")
            if not our_product_id:
                continue
            snapshot = get_channel_push_snapshot(supabase, our_product_id, "shopify")
            if snapshot:
                vt = snapshot.get("variation_type") or "SHOPIFY_META"
                pv = snapshot.get("ai_prompt_version") or "unknown"
            else:
                vt = "SHOPIFY_META"
                pv = "unknown"
            key = (str(our_product_id), vt, pv)
            agg[key]["orders_count"] += 1
            try:
                item_total = float(item.get("price") or 0) * int(item.get("quantity") or 1)
                agg[key]["revenue_cents"] += int(Decimal(str(item_total)) * 100)
            except Exception:
                pass
    return dict(agg)


@celery_app.task(bind=True, max_retries=3)
def fetch_shopify_orders_and_update_performance_logs(self, period_start_iso: str = None, period_end_iso: str = None):
    """
    Weekly feedback moat task: fetch Shopify orders for the period, join to
    channel_push_snapshots to get variation_type and ai_prompt_version, then
    upsert into performance_logs.
    If period_start_iso/period_end_iso are omitted, uses the previous calendar week (Mon–Sun).
    """
    if period_start_iso and period_end_iso:
        period_start = period_start_iso[:10]
        period_end = period_end_iso[:10]
    else:
        # Previous calendar week (Monday 00:00 to Sunday 23:59 UTC)
        now = datetime.now(timezone.utc)
        last_monday = now - timedelta(days=now.weekday() + 7)
        period_start = last_monday.date().isoformat()
        period_end = (last_monday + timedelta(days=6)).date().isoformat()

    created_min = f"{period_start}T00:00:00Z"
    created_max = f"{period_end}T23:59:59Z"

    supabase = get_supabase()
    if not supabase:
        return {"status": "error", "error": "Database not configured", "period_start": period_start, "period_end": period_end}

    stores = list_shopify_stores(supabase)
    if not stores:
        return {"status": "ok", "stores": 0, "period_start": period_start, "period_end": period_end, "upserted": 0}

    total_upserted = 0
    for store in stores:
        shop_domain = store.get("shop_domain")
        access_token = store.get("access_token")
        if not shop_domain or not access_token:
            continue
        try:
            orders = _fetch_shopify_orders(shop_domain, access_token, created_min, created_max)
        except Exception as e:
            continue
        agg = _aggregate_orders_to_performance(orders, supabase)
        for (product_id, variation_type, ai_prompt_version), counts in agg.items():
            try:
                upsert_performance_log(
                    supabase,
                    product_id=product_id,
                    variation_type=variation_type,
                    ai_prompt_version=ai_prompt_version,
                    period_start=period_start,
                    period_end=period_end,
                    click_count=0,
                    orders_count=counts["orders_count"],
                    revenue_cents=counts["revenue_cents"],
                    conversion_rate=0.0,
                )
                total_upserted += 1
            except Exception:
                pass

    return {
        "status": "ok",
        "stores": len(stores),
        "period_start": period_start,
        "period_end": period_end,
        "upserted": total_upserted,
    }
