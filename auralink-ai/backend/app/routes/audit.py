"""
Audit Mode (Premium): multi-item count and bounding boxes.
"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.audit_service import run_audit_count, AuditCountResult

router = APIRouter()


class AuditRequest(BaseModel):
    image_base64: str
    min_count: int = 1
    max_count: int = 500


@router.post("/count", response_model=AuditCountResult)
async def audit_count(request: AuditRequest):
    """
    For images with multiple items (e.g. box of 50 patches), estimate count
    and return bounding boxes for user confirmation.
    """
    return await run_audit_count(
        image_base64=request.image_base64,
        min_count=request.min_count,
        max_count=request.max_count,
    )
