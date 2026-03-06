"""Universal product and channel adapter schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ChannelAdapterRecord(BaseModel):
    """Platform-specific ID for one channel."""
    channel: str  # e.g. "shopify", "amazon", "depop", "tiktok_shop"
    external_id: str  # e.g. Shopify GID, Amazon ASIN
    synced_at: Optional[datetime] = None


class UniversalProductCreate(BaseModel):
    """Payload to create or update a master product (UCP fields optional)."""
    attributes_material: Optional[str] = None
    attributes_color: Optional[str] = None
    attributes_weight: Optional[str] = None
    attributes_dimensions: Optional[str] = None
    attributes_brand: Optional[str] = None
    exact_model: Optional[str] = None
    material_composition: Optional[str] = None
    weight_grams: Optional[float] = None
    condition_score: Optional[float] = None
    copy_seo_title: str
    copy_description: str
    copy_bullet_points: list[str] = Field(default_factory=list)
    tags_category: Optional[str] = None
    tags_search_keywords: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    image_urls: list[str] = Field(default_factory=list)
    status: str = Field(default="DRAFT", pattern="^(DRAFT|ACTIVE|PUBLISHED)$")
    source_image_id: Optional[str] = None


class UniversalProductResponse(BaseModel):
    """Product as returned from DB (master profile + channel adapters)."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    attributes_material: Optional[str] = None
    attributes_color: Optional[str] = None
    attributes_weight: Optional[str] = None
    attributes_dimensions: Optional[str] = None
    attributes_brand: Optional[str] = None
    copy_seo_title: str
    copy_description: str
    copy_bullet_points: list[str]
    tags_category: Optional[str] = None
    tags_search_keywords: list[str]
    image_url: Optional[str] = None
    image_urls: list[str]
    status: str
    source_image_id: Optional[str] = None
    channel_adapters: list[ChannelAdapterRecord] = Field(default_factory=list)
