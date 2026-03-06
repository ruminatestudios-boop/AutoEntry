"""
Supabase/PostgreSQL: Universal_Products and Channel_Adapters.
"""
from typing import Optional, Any
from uuid import uuid4

from app.config import get_settings
from app.schemas.product import UniversalProductCreate


_supabase_client: Optional[Any] = None


def get_supabase():
    """Return Supabase client or None if not configured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    try:
        from supabase import create_client
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_service_key,
        )
        return _supabase_client
    except Exception:
        return None


def create_product(supabase, payload: UniversalProductCreate) -> dict:
    """Insert into universal_products; return inserted row."""
    row = {
        "id": str(uuid4()),
        "attributes_material": payload.attributes_material,
        "attributes_color": payload.attributes_color,
        "attributes_weight": payload.attributes_weight,
        "attributes_dimensions": payload.attributes_dimensions,
        "attributes_brand": payload.attributes_brand,
        "copy_seo_title": payload.copy_seo_title,
        "copy_description": payload.copy_description,
        "copy_bullet_points": payload.copy_bullet_points,
        "tags_category": payload.tags_category,
        "tags_search_keywords": payload.tags_search_keywords,
        "image_url": payload.image_url,
        "image_urls": payload.image_urls or [],
        "status": payload.status,
        "source_image_id": payload.source_image_id,
    }
    if payload.exact_model is not None:
        row["exact_model"] = payload.exact_model
    if payload.material_composition is not None:
        row["material_composition"] = payload.material_composition
    if payload.weight_grams is not None:
        row["weight_grams"] = payload.weight_grams
    if payload.condition_score is not None:
        row["condition_score"] = payload.condition_score
    r = supabase.table("universal_products").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise ValueError("Insert failed")
    return r.data[0]


def get_product(supabase, product_id: str) -> Optional[dict]:
    """Get product by id; join channel_adapters if table exists."""
    r = supabase.table("universal_products").select("*").eq("id", product_id).execute()
    if not r.data or len(r.data) == 0:
        return None
    row = r.data[0]
    # Load channel adapters
    try:
        ar = supabase.table("channel_adapters").select("*").eq("product_id", product_id).execute()
        row["channel_adapters"] = ar.data or []
    except Exception:
        row["channel_adapters"] = []
    return row


def list_products(supabase, limit: int = 50, offset: int = 0) -> list:
    """List products ordered by created_at desc."""
    r = (
        supabase.table("universal_products")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return r.data or []


def update_product_status(supabase, product_id: str, status: str) -> Optional[dict]:
    """Update product status (e.g. DRAFT -> PUBLISHED). Returns updated row or None."""
    try:
        from datetime import datetime
        r = (
            supabase.table("universal_products")
            .update({"status": status, "updated_at": datetime.utcnow().isoformat()})
            .eq("id", product_id)
            .execute()
        )
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        pass
    return None


def get_shopify_store(supabase, shop_domain: str) -> Optional[dict]:
    """Get Shopify store credentials by domain."""
    r = supabase.table("shopify_stores").select("*").eq("shop_domain", shop_domain).execute()
    if not r.data or len(r.data) == 0:
        return None
    return r.data[0]


def upsert_shopify_store(supabase, shop_domain: str, access_token: str, scope: str = "") -> dict:
    """Insert or update Shopify store credentials."""
    from datetime import datetime
    row = {
        "shop_domain": shop_domain,
        "access_token": access_token,
        "scope": scope,
        "updated_at": datetime.utcnow().isoformat(),
    }
    r = supabase.table("shopify_stores").upsert(
        row, on_conflict="shop_domain", update_columns=["access_token", "scope", "updated_at"]
    ).execute()
    if not r.data or len(r.data) == 0:
        raise ValueError("Upsert failed")
    return r.data[0]


def upsert_channel_adapter(supabase, product_id: str, channel: str, external_id: str) -> dict:
    """Insert or update channel adapter (e.g. Shopify GID)."""
    from datetime import datetime
    row = {
        "product_id": product_id,
        "channel": channel,
        "external_id": external_id,
        "synced_at": datetime.utcnow().isoformat(),
    }
    r = supabase.table("channel_adapters").upsert(
        row, on_conflict="product_id,channel", update_columns=["external_id", "synced_at"]
    ).execute()
    if not r.data or len(r.data) == 0:
        raise ValueError("Upsert failed")
    return r.data[0]


def list_shopify_stores(supabase) -> list:
    """List all connected Shopify stores (for feedback worker)."""
    try:
        r = supabase.table("shopify_stores").select("shop_domain, access_token, refresh_token, token_expires_at").execute()
        return r.data or []
    except Exception:
        try:
            r = supabase.table("shopify_stores").select("shop_domain, access_token").execute()
            return r.data or []
        except Exception:
            return []


def get_valid_shopify_access_token(supabase, shop_domain: str) -> tuple[Optional[str], Optional[str]]:
    """
    Return (access_token, None) or (None, error_message). Uses stored token; refreshes if
    token_expires_at is in the past and refresh_token is set. Shopify offline tokens are long-lived.
    """
    try:
        r = supabase.table("shopify_stores").select(
            "access_token, refresh_token, token_expires_at"
        ).eq("shop_domain", shop_domain).limit(1).execute()
    except Exception:
        return None, "Database error"
    if not r.data or len(r.data) == 0:
        return None, "Store not connected"
    row = r.data[0]
    access_token = row.get("access_token")
    refresh_token = row.get("refresh_token")
    expires_at = row.get("token_expires_at")
    if not access_token:
        return None, "No access token"
    if refresh_token and expires_at:
        try:
            from datetime import datetime, timezone
            if hasattr(expires_at, "timestamp"):
                exp = expires_at
            else:
                exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp <= datetime.now(timezone.utc):
                new_token = _refresh_shopify_token(supabase, shop_domain, refresh_token)
                if new_token:
                    return new_token, None
        except Exception:
            pass
    return access_token, None


def _refresh_shopify_token(supabase, shop_domain: str, refresh_token: str) -> Optional[str]:
    """Refresh Shopify access token when refresh_token is set (e.g. online token flow). Returns new access_token or None."""
    settings = get_settings()
    if not settings.shopify_client_id or not settings.shopify_client_secret:
        return None
    import httpx
    from datetime import datetime, timezone, timedelta
    url = f"https://{shop_domain}/admin/oauth/access_token"
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                url,
                data={
                    "client_id": settings.shopify_client_id,
                    "client_secret": settings.shopify_client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if r.status_code != 200:
            return None
        data = r.json()
        new_token = data.get("access_token")
        expires_in = data.get("expires_in")
        if not new_token:
            return None
        updated = {"access_token": new_token, "updated_at": datetime.now(timezone.utc).isoformat()}
        if expires_in is not None:
            updated["token_expires_at"] = (datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))).isoformat()
        supabase.table("shopify_stores").update(updated).eq("shop_domain", shop_domain).execute()
        return new_token
    except Exception:
        return None


def get_channel_adapter_by_external_id(supabase, channel: str, external_id: str) -> Optional[dict]:
    """Get channel adapter by channel and external_id (e.g. Shopify GID). Returns row with product_id."""
    try:
        r = (
            supabase.table("channel_adapters")
            .select("product_id, external_id")
            .eq("channel", channel)
            .eq("external_id", external_id)
            .limit(1)
            .execute()
        )
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        pass
    return None


def get_channel_push_snapshot(supabase, product_id: str, channel: str) -> Optional[dict]:
    """Get the latest channel_push_snapshot for this product and channel (variation_type, ai_prompt_version)."""
    try:
        r = (
            supabase.table("channel_push_snapshots")
            .select("variation_type, ai_prompt_version")
            .eq("product_id", product_id)
            .eq("channel", channel)
            .order("pushed_at", desc=True)
            .limit(1)
            .execute()
        )
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        pass
    return None


def upsert_performance_log(
    supabase,
    product_id: str,
    variation_type: str,
    ai_prompt_version: str,
    period_start: str,
    period_end: str,
    *,
    click_count: int = 0,
    orders_count: int = 0,
    revenue_cents: int = 0,
    conversion_rate: float = 0.0,
) -> dict:
    """Insert or update a performance_logs row (unique on product_id, variation_type, ai_prompt_version, period_start, period_end)."""
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    row = {
        "product_id": product_id,
        "variation_type": variation_type,
        "ai_prompt_version": ai_prompt_version,
        "period_start": period_start,
        "period_end": period_end,
        "click_count": click_count,
        "orders_count": orders_count,
        "revenue_cents": revenue_cents,
        "conversion_rate": conversion_rate,
        "updated_at": now,
    }
    try:
        r = supabase.table("performance_logs").upsert(
            row,
            on_conflict="product_id,variation_type,ai_prompt_version,period_start,period_end",
            update_columns=["click_count", "orders_count", "revenue_cents", "conversion_rate", "updated_at"],
        ).execute()
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        # Fallback: try insert (ignore if unique violation)
        try:
            row["created_at"] = now
            r = supabase.table("performance_logs").insert(row).execute()
            if r.data and len(r.data) > 0:
                return r.data[0]
        except Exception:
            pass
    return row


def insert_channel_push_snapshot(
    supabase,
    product_id: str,
    channel: str,
    external_id: str,
    variation_type: str,
    ai_prompt_version: str,
    description_variation_id: Optional[str] = None,
) -> dict:
    """Record which variation was pushed to a channel (for feedback correlation)."""
    row = {
        "product_id": product_id,
        "channel": channel,
        "external_id": external_id,
        "variation_type": variation_type,
        "ai_prompt_version": ai_prompt_version,
    }
    if description_variation_id:
        row["description_variation_id"] = description_variation_id
    r = supabase.table("channel_push_snapshots").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise ValueError("Insert channel_push_snapshot failed")
    return r.data[0]


def get_ucp_manifest(supabase, product_id: str) -> Optional[dict]:
    """Get stored UCP manifest for a product (manifest_json + updated_at)."""
    try:
        r = supabase.table("ucp_manifests").select("*").eq("product_id", product_id).limit(1).execute()
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        pass
    return None


def upsert_ucp_manifest(supabase, product_id: str, manifest_json: dict) -> dict:
    """Insert or update ucp_manifests row for this product (one manifest per listing)."""
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    row = {
        "product_id": product_id,
        "manifest_json": manifest_json,
        "updated_at": now,
    }
    try:
        r = supabase.table("ucp_manifests").upsert(
            row,
            on_conflict="product_id",
            update_columns=["manifest_json", "updated_at"],
        ).execute()
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        try:
            r = supabase.table("ucp_manifests").insert(row).execute()
            if r.data and len(r.data) > 0:
                return r.data[0]
        except Exception:
            pass
    return row


def get_description_variation(supabase, product_id: str, variation_type: str = "SHOPIFY_META") -> Optional[dict]:
    """Get description_variation for product (for copy_fact_feel_proof GEO)."""
    try:
        r = (
            supabase.table("description_variations")
            .select("*")
            .eq("product_id", product_id)
            .eq("variation_type", variation_type)
            .limit(1)
            .execute()
        )
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        pass
    return None


def upsert_description_variation(
    supabase,
    product_id: str,
    variation_type: str,
    copy_seo_title: str,
    copy_description: str,
    copy_bullet_points: Optional[list] = None,
    copy_fact_feel_proof: Optional[dict] = None,
    ai_prompt_version_id: Optional[str] = None,
) -> dict:
    """Insert or update a description_variation (e.g. SHOPIFY_META with Fact-Feel-Proof)."""
    from datetime import datetime
    row = {
        "product_id": product_id,
        "variation_type": variation_type,
        "copy_seo_title": copy_seo_title,
        "copy_description": copy_description,
        "copy_bullet_points": copy_bullet_points if copy_bullet_points is not None else [],
        "copy_fact_feel_proof": copy_fact_feel_proof,
    }
    if ai_prompt_version_id:
        row["ai_prompt_version_id"] = ai_prompt_version_id
    try:
        r = supabase.table("description_variations").upsert(
            row,
            on_conflict="product_id,variation_type",
            update_columns=["copy_seo_title", "copy_description", "copy_bullet_points", "copy_fact_feel_proof", "ai_prompt_version_id"],
        ).execute()
        if r.data and len(r.data) > 0:
            return r.data[0]
    except Exception:
        pass
    r = supabase.table("description_variations").insert(row).execute()
    if not r.data or len(r.data) == 0:
        raise ValueError("Insert description_variation failed")
    return r.data[0]


# ---------------------------------------------------------------------------
# Free scan quota (3 free scans per user, then paywall)
# ---------------------------------------------------------------------------

FREE_SCANS_LIMIT = 3


def get_scan_usage(supabase, clerk_user_id: str) -> dict:
    """Return { free_scans_used, free_scans_limit, can_scan } for the user."""
    try:
        r = supabase.table("user_scan_quota").select("free_scans_used").eq("clerk_user_id", clerk_user_id).limit(1).execute()
        used = r.data[0]["free_scans_used"] if r.data and len(r.data) > 0 else 0
    except Exception:
        used = 0
    return {
        "free_scans_used": used,
        "free_scans_limit": FREE_SCANS_LIMIT,
        "can_scan": used < FREE_SCANS_LIMIT,
    }


def increment_free_scan(supabase, clerk_user_id: str) -> dict:
    """Increment free_scans_used for user; upsert row if missing. Returns updated usage."""
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    try:
        r = supabase.table("user_scan_quota").select("free_scans_used").eq("clerk_user_id", clerk_user_id).limit(1).execute()
        if r.data and len(r.data) > 0:
            new_count = (r.data[0].get("free_scans_used") or 0) + 1
            supabase.table("user_scan_quota").update({"free_scans_used": new_count, "updated_at": now}).eq("clerk_user_id", clerk_user_id).execute()
        else:
            supabase.table("user_scan_quota").insert({
                "clerk_user_id": clerk_user_id,
                "free_scans_used": 1,
                "updated_at": now,
            }).execute()
            new_count = 1
    except Exception:
        try:
            supabase.table("user_scan_quota").insert({
                "clerk_user_id": clerk_user_id,
                "free_scans_used": 1,
                "updated_at": now,
            }).execute()
        except Exception:
            pass
        new_count = 1
    return {"free_scans_used": new_count, "free_scans_limit": FREE_SCANS_LIMIT, "can_scan": new_count < FREE_SCANS_LIMIT}
