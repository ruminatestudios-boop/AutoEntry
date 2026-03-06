"""
GEO: serve /.well-known/ucp discovery and per-listing manifests for AI discovery.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import get_supabase, get_product, get_ucp_manifest, list_products
from app.services.ucp_manifest import build_ucp_manifest_json, build_and_upsert_ucp_manifest
from app.db import get_description_variation

router = APIRouter()


def _base_url() -> str:
    return get_settings().app_base_url.rstrip("/")


@router.get("", response_class=JSONResponse)
def get_ucp_discovery():
    """
    Store-level UCP discovery (/.well-known/ucp).
    Tells AI agents how to find product manifests. products_url points to per-listing manifests.
    """
    base = _base_url()
    return JSONResponse(
        content={
            "ucp_version": "2025.1",
            "merchant_id": None,
            "capabilities": {
                "native_checkout": False,
                "embedded_checkout": False,
            },
            "endpoints": {
                "products_url": f"{base}/.well-known/ucp/products",
            },
            "product_manifest_url_template": f"{base}/.well-known/ucp/products/{{product_id}}",
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
        },
    )


@router.get("/products", response_class=JSONResponse)
def list_ucp_product_ids():
    """List product IDs that have (or can have) UCP manifests; for agent discovery."""
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    products = list_products(supabase, limit=500, offset=0)
    ids = [str(p["id"]) for p in products]
    return JSONResponse(
        content={"product_ids": ids, "ucp_version": "2025.1"},
        headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60"},
    )


@router.get("/products/{product_id}", response_class=JSONResponse)
def get_product_ucp_manifest(product_id: str):
    """
    Per-listing UCP manifest: schema.org/Product + Fact–Feel–Proof.
    AI assistants use this to read and recommend products (GEO).
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    # Prefer stored manifest; otherwise build on the fly and store
    stored = get_ucp_manifest(supabase, product_id)
    if stored and stored.get("manifest_json"):
        body = stored["manifest_json"]
    else:
        product = get_product(supabase, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        variation = get_description_variation(supabase, product_id, "SHOPIFY_META")
        body = build_ucp_manifest_json(product, _base_url(), variation)
        # Persist for next time
        try:
            from app.db import upsert_ucp_manifest
            upsert_ucp_manifest(supabase, product_id, body)
        except Exception:
            pass
    return JSONResponse(
        content=body,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
        },
    )
