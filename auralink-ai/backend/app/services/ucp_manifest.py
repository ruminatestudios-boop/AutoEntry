"""
GEO (Generative Engine Optimization): build UCP manifest per listing.
Fact–Feel–Proof structure + schema.org/Product for AI discovery (/.well-known/ucp).
"""
from typing import Any, Optional


def build_ucp_manifest_json(
    product: dict,
    base_url: str,
    description_variation: Optional[dict] = None,
) -> dict:
    """
    Build per-listing UCP manifest: schema.org/Product plus Fact–Feel–Proof for AI assistants.
    - Hard specs first (~60 words), then lifestyle benefit (feel), then real-world context (proof).
    """
    pid = str(product.get("id", ""))
    # schema.org/Product core
    manifest: dict[str, Any] = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.get("copy_seo_title") or "Product",
        "description": product.get("copy_description") or "",
        "identifier": pid,
    }
    # Optional schema.org fields from UCP attributes
    if product.get("attributes_brand"):
        manifest["brand"] = {"@type": "Brand", "name": product["attributes_brand"]}
    if product.get("exact_model"):
        manifest["model"] = product["exact_model"]
    if product.get("material_composition"):
        manifest["material"] = product["material_composition"]
    if product.get("weight_grams") is not None:
        manifest["weight"] = {"@type": "QuantitativeValue", "value": product["weight_grams"], "unitCode": "GRM"}
    if product.get("attributes_dimensions"):
        manifest["dimensions"] = product["attributes_dimensions"]
    if product.get("image_url"):
        manifest["image"] = product["image_url"]
    if product.get("image_urls"):
        manifest["image"] = manifest.get("image") or product["image_urls"][0] if product["image_urls"] else None
        if product.get("image_urls") and len(product["image_urls"]) > 1:
            manifest["image"] = product["image_urls"]

    # GEO: Fact–Feel–Proof structured for AI shoppers (recommendation-friendly)
    ffp = None
    if description_variation and description_variation.get("copy_fact_feel_proof"):
        ffp = description_variation["copy_fact_feel_proof"]
    if ffp and isinstance(ffp, dict):
        manifest["factFeelProof"] = {
            "fact": ffp.get("fact") or "",
            "feel": ffp.get("feel") or "",
            "proof": ffp.get("proof") or "",
        }
    else:
        # Single description as fallback (already structured as fact+feel+proof in copy_description)
        manifest["factFeelProof"] = {"fact": product.get("copy_description") or "", "feel": "", "proof": ""}

    # Self link for this listing's manifest (AI can cache or follow)
    manifest["url"] = f"{base_url.rstrip('/')}/.well-known/ucp/products/{pid}"
    manifest["ucp_version"] = "2025.1"
    return manifest


def build_and_upsert_ucp_manifest(supabase, product_id: str, base_url: str) -> Optional[dict]:
    """
    Load product and optional description_variation, build manifest JSON, upsert into ucp_manifests.
    Call after product create/update. Returns manifest row or None on failure.
    """
    from app.db import get_product, get_description_variation, upsert_ucp_manifest
    product = get_product(supabase, product_id)
    if not product:
        return None
    variation = get_description_variation(supabase, product_id, "SHOPIFY_META")
    manifest_json = build_ucp_manifest_json(product, base_url, variation)
    return upsert_ucp_manifest(supabase, product_id, manifest_json)
