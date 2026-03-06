"""
In-memory store for demo/dummy runs when Supabase is not configured.
Lets you run the full flow: scan → extract → save as draft → list products.
Data is lost on server restart.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from app.schemas.product import UniversalProductCreate


_demo_products: dict[str, dict] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_product_demo(payload: UniversalProductCreate) -> dict:
    """Create a product in memory; return row-like dict with id, created_at."""
    product_id = str(uuid4())
    now = _now()
    row = {
        "id": product_id,
        "created_at": now,
        "updated_at": now,
        "attributes_material": payload.attributes_material,
        "attributes_color": payload.attributes_color,
        "attributes_weight": payload.attributes_weight,
        "attributes_dimensions": payload.attributes_dimensions,
        "attributes_brand": payload.attributes_brand,
        "copy_seo_title": payload.copy_seo_title,
        "copy_description": payload.copy_description,
        "copy_bullet_points": payload.copy_bullet_points or [],
        "tags_category": payload.tags_category,
        "tags_search_keywords": payload.tags_search_keywords or [],
        "image_url": payload.image_url,
        "image_urls": payload.image_urls or [],
        "status": payload.status or "DRAFT",
        "source_image_id": payload.source_image_id,
        "channel_adapters": [],
    }
    _demo_products[product_id] = row
    return row


def get_product_demo(product_id: str) -> Optional[dict]:
    """Return product dict or None."""
    return _demo_products.get(product_id)


def list_products_demo(limit: int = 50, offset: int = 0) -> list:
    """List products (newest first). Returns list of row-like dicts."""
    rows = sorted(_demo_products.values(), key=lambda r: r["created_at"], reverse=True)
    return rows[offset : offset + limit]
