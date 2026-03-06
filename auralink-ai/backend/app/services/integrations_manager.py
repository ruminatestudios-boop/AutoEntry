"""
Multi-channel orchestration: adapt copy per channel (TikTok <500 chars, Amazon bullets, Shopify meta/SEO).
Pushes are event-driven (e.g. listing published → webhook) and use OAuth with token refresh where supported.
"""
from dataclasses import dataclass
from typing import Any, Optional

# Channel identifiers (must match channel_adapters and description_variations.variation_type)
CHANNEL_SHOPIFY = "shopify"
CHANNEL_AMAZON = "amazon"
CHANNEL_TIKTOK_SHOP = "tiktok_shop"
CHANNEL_DEPOP = "depop"

# Variation types that map to channels when present
VARIATION_SHOPIFY_META = "SHOPIFY_META"
VARIATION_AMAZON_BULLETS = "AMAZON_BULLETS"
VARIATION_TIKTOK_VIRAL = "TIKTOK_VIRAL"

# Platform limits (from docs / best practice)
TIKTOK_DESCRIPTION_MAX_CHARS = 500
SHOPIFY_TITLE_MAX_CHARS = 255
AMAZON_BULLETS_MAX = 5
AMAZON_BULLET_MAX_CHARS = 500


@dataclass
class ChannelCopy:
    """Copy adapted for a specific channel (title, description, bullets)."""
    title: str
    description: str
    bullets: list[str]
    vendor: Optional[str] = None
    tags: list[str] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []


def _truncate(text: str, max_len: int, suffix: str = "") -> str:
    if not text or len(text) <= max_len:
        return text or ""
    return (text[: max_len - len(suffix)].rsplit(maxsplit=1)[0] or text[: max_len - len(suffix)]) + suffix


def _get_variation(variation_by_type: Optional[dict[str, dict]], variation_type: str) -> Optional[dict]:
    if not variation_by_type:
        return None
    return variation_by_type.get(variation_type)


def adapt_for_shopify(product: dict, variation_by_type: Optional[dict[str, dict]] = None) -> ChannelCopy:
    """
    Shopify: meta/SEO-focused. Use SHOPIFY_META variation when present, else master product.
    Title and descriptionHtml; vendor and tags from attributes/keywords.
    """
    var = _get_variation(variation_by_type, VARIATION_SHOPIFY_META)
    if var:
        title = (var.get("copy_seo_title") or product.get("copy_seo_title") or "Product")[:SHOPIFY_TITLE_MAX_CHARS]
        description = var.get("copy_description") or product.get("copy_description") or ""
    else:
        title = (product.get("copy_seo_title") or "Product")[:SHOPIFY_TITLE_MAX_CHARS]
        description = product.get("copy_description") or ""
    vendor = (product.get("attributes_brand") or "")[:255]
    tags_list = list(product.get("tags_search_keywords") or [])
    if product.get("tags_category"):
        tags_list.insert(0, product["tags_category"])
    tags_list = [str(t)[:255] for t in tags_list[:250]]
    return ChannelCopy(title=title, description=description, bullets=product.get("copy_bullet_points") or [], vendor=vendor or None, tags=tags_list)


def adapt_for_tiktok(product: dict, variation_by_type: Optional[dict[str, dict]] = None) -> ChannelCopy:
    """
    TikTok Shop: description must be ≤500 characters. Use TIKTOK_VIRAL when present, else truncate master.
    """
    var = _get_variation(variation_by_type, VARIATION_TIKTOK_VIRAL)
    if var:
        raw = var.get("copy_description") or var.get("copy_seo_title") or product.get("copy_description") or product.get("copy_seo_title") or ""
    else:
        raw = product.get("copy_description") or product.get("copy_seo_title") or "Product"
    description = _truncate(raw.strip(), TIKTOK_DESCRIPTION_MAX_CHARS)
    title = (product.get("copy_seo_title") or "Product")[:255]
    bullets = product.get("copy_bullet_points") or []
    return ChannelCopy(title=title, description=description, bullets=bullets)


def adapt_for_amazon(product: dict, variation_by_type: Optional[dict[str, dict]] = None) -> ChannelCopy:
    """
    Amazon: bullet-focused. Use AMAZON_BULLETS variation when present; bullets truncated per Amazon limits.
    """
    var = _get_variation(variation_by_type, VARIATION_AMAZON_BULLETS)
    if var:
        bullets_raw = var.get("copy_bullet_points") or []
        description = var.get("copy_description") or product.get("copy_description") or ""
        title = (var.get("copy_seo_title") or product.get("copy_seo_title") or "Product")[:255]
    else:
        bullets_raw = product.get("copy_bullet_points") or []
        description = product.get("copy_description") or ""
        title = (product.get("copy_seo_title") or "Product")[:255]
    bullets = []
    for i, b in enumerate(bullets_raw[:AMAZON_BULLETS_MAX]):
        if isinstance(b, str):
            bullets.append(_truncate(b, AMAZON_BULLET_MAX_CHARS))
    if not bullets and description:
        bullets = [_truncate(description, AMAZON_BULLET_MAX_CHARS)]
    return ChannelCopy(title=title, description=description or (bullets[0] if bullets else ""), bullets=bullets)


def adapt_for_depop(product: dict, variation_by_type: Optional[dict[str, dict]] = None) -> ChannelCopy:
    """Depop-style: photo + description; use SHOPIFY_META or master."""
    return adapt_for_shopify(product, variation_by_type)


class IntegrationsManager:
    """
    Adapts master product copy per channel: TikTok <500 chars, Amazon bullet-focused, Shopify meta/SEO.
    Use with event-driven pushes (listing published → webhook) and OAuth token refresh.
    """

    _adapters = {
        CHANNEL_SHOPIFY: adapt_for_shopify,
        CHANNEL_AMAZON: adapt_for_amazon,
        CHANNEL_TIKTOK_SHOP: adapt_for_tiktok,
        CHANNEL_DEPOP: adapt_for_depop,
    }

    @classmethod
    def supported_channels(cls) -> list[str]:
        return list(cls._adapters.keys())

    @classmethod
    def adapt(cls, product: dict, channel: str, variation_by_type: Optional[dict[str, dict]] = None) -> ChannelCopy:
        """
        Return channel-specific copy for the given product.
        variation_by_type: optional dict keyed by variation_type (SHOPIFY_META, AMAZON_BULLETS, TIKTOK_VIRAL).
        """
        fn = cls._adapters.get(channel)
        if not fn:
            raise ValueError(f"Unsupported channel: {channel}. Supported: {cls.supported_channels()}")
        return fn(product, variation_by_type)

    @classmethod
    def load_product_and_variations(cls, supabase, product_id: str) -> tuple[Optional[dict], dict[str, dict]]:
        """
        Load product and description_variations for all channel variation types.
        Returns (product, variation_by_type) or (None, {}) if product not found.
        """
        from app.db import get_product, get_description_variation
        product = get_product(supabase, product_id)
        if not product:
            return None, {}
        variation_by_type = {}
        for vtype in (VARIATION_SHOPIFY_META, VARIATION_AMAZON_BULLETS, VARIATION_TIKTOK_VIRAL):
            v = get_description_variation(supabase, product_id, vtype)
            if v:
                variation_by_type[vtype] = v
        return product, variation_by_type
