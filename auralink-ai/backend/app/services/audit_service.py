"""
Audit Mode (Premium): Crowd-counting / density estimation for images with multiple items.
Returns count and optional bounding boxes for user confirmation.
"""
from typing import Optional
from pydantic import BaseModel


class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class AuditCountResult(BaseModel):
    """Result of density/count estimation."""
    estimated_count: int
    confidence: float  # 0–1
    bounding_boxes: list[BoundingBox] = []  # Optional per-item boxes
    message: Optional[str] = None


async def run_audit_count(
    image_base64: str,
    min_count: int = 1,
    max_count: int = 500,
) -> AuditCountResult:
    """
    Placeholder: Density Map Estimation / crowd counting for multi-item images.
    In production, integrate a model (e.g. density-based or detection-based count).
    """
    # TODO: Integrate Florence-2 or a density estimation model to:
    # 1. Detect multiple items in image (e.g. box of 50 patches)
    # 2. Return estimated count and bounding boxes for user confirmation
    return AuditCountResult(
        estimated_count=1,
        confidence=0.5,
        bounding_boxes=[],
        message="Audit mode: integrate density/count model for multi-item detection.",
    )
