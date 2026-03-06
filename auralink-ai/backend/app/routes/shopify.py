"""
Shopify OAuth: install URL, callback, token exchange.
Stores credentials in shopify_stores for sync_to_shopify.
"""
import hashlib
import hmac
import secrets
import urllib.parse
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import get_settings
from app.db import get_supabase, upsert_shopify_store
from app.auth import verify_clerk

router = APIRouter()

SHOPIFY_SCOPES = "read_products,write_products,read_inventory,write_inventory,read_orders"

_SHOPIFY_CONFIG_HINT = (
    "Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in the backend .env (from Shopify Partner Dashboard → App → API credentials). "
    "If you use the publishing service (port 8001) for connect, set SHOPIFY_API_KEY and SHOPIFY_API_SECRET in publishing/.env instead."
)


def _normalize_shop_domain(raw: str) -> str:
    """Extract a valid myshopify.com host from input (store name, URL, or full domain)."""
    raw = (raw or "").strip().lower()
    raw = raw.split("?")[0].split("#")[0].rstrip("/")
    if not raw:
        return ""
    if raw.startswith("http://"):
        raw = raw[7:]
    elif raw.startswith("https://"):
        raw = raw[8:]
    if "/" in raw:
        raw = raw.split("/")[0]
    if raw.endswith(".myshopify.com"):
        return raw
    if "." in raw:
        # e.g. fightlore.store -> use first part as store name
        raw = raw.split(".")[0]
    if raw and (raw.replace("-", "").replace("_", "").isalnum()):
        return f"{raw}.myshopify.com"
    return ""


def _verify_hmac(query_dict: dict, secret: str, received_hmac: str) -> bool:
    """Verify Shopify HMAC: params (excluding hmac) sorted, joined, HMAC-SHA256."""
    if "hmac" in query_dict:
        params = {k: v for k, v in query_dict.items() if k != "hmac"}
    else:
        params = dict(query_dict)
    msg = urlencode(sorted(params.items()))
    computed = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, received_hmac)


@router.get("/install")
async def shopify_install(shop: str = Query(..., description="Shop domain (e.g. mystore.myshopify.com)")):
    """
    Start OAuth: redirect to Shopify admin OAuth authorize.
    """
    settings = get_settings()
    if not settings.shopify_client_id or not settings.shopify_client_secret:
        raise HTTPException(
            status_code=503,
            detail=_SHOPIFY_CONFIG_HINT,
        )
    shop = _normalize_shop_domain(shop)
    if not shop:
        raise HTTPException(status_code=400, detail="Invalid shop: use your store name (e.g. fightlore) or xxx.myshopify.com")
    base = settings.app_base_url.rstrip("/")
    redirect_uri = f"{base}/api/v1/shopify/callback"
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.shopify_client_id,
        "scope": SHOPIFY_SCOPES,
        "redirect_uri": redirect_uri,
        "state": state,
    }
    auth_url = f"https://{shop}/admin/oauth/authorize?{urlencode(params)}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/status")
async def shopify_config_status():
    """Return whether Shopify OAuth is configured (for debugging). No auth required."""
    settings = get_settings()
    configured = bool(
        settings.shopify_client_id and settings.shopify_client_secret
    )
    return {"shopify_configured": configured}


@router.get("/callback")
async def shopify_callback(
    code: str = Query(...),
    shop: str = Query(...),
    hmac_param: str = Query(..., alias="hmac"),
    state: str = Query(None),
    timestamp: str = Query(None),
):
    """
    OAuth callback: exchange code for access_token, store in shopify_stores.
    """
    settings = get_settings()
    if not settings.shopify_client_id or not settings.shopify_client_secret:
        raise HTTPException(
            status_code=503,
            detail=_SHOPIFY_CONFIG_HINT,
        )
    query_dict = {"code": code, "shop": shop, "hmac": hmac_param}
    if state:
        query_dict["state"] = state
    if timestamp:
        query_dict["timestamp"] = timestamp
    if not _verify_hmac(query_dict, settings.shopify_client_secret, hmac_param):
        raise HTTPException(status_code=400, detail="Invalid HMAC")
    shop = _normalize_shop_domain(shop)
    if not shop:
        raise HTTPException(status_code=400, detail="Invalid shop domain")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://{shop}/admin/oauth/access_token",
            data={
                "client_id": settings.shopify_client_id,
                "client_secret": settings.shopify_client_secret,
                "code": code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {r.text}")
    data = r.json()
    access_token = data.get("access_token")
    scope = data.get("scope", "")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access_token in response")
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    upsert_shopify_store(supabase, shop, access_token, scope)
    from fastapi.responses import RedirectResponse
    frontend = getattr(settings, "frontend_url", None) or settings.app_base_url.replace(":8000", ":3000")
    return RedirectResponse(url=f"{frontend}/dashboard?shopify=connected&shop={urllib.parse.quote(shop)}", status_code=302)


@router.get("/stores")
async def list_shopify_stores(_auth: dict = Depends(verify_clerk)):
    """List connected Shopify stores (for UI)."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        r = supabase.table("shopify_stores").select("shop_domain, created_at").execute()
        return {"stores": r.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
