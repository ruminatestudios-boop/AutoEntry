"""
User usage: tier + scan quota for paywall flow.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import verify_clerk
from app.db import get_supabase, get_scan_usage, starter_monthly_limit

router = APIRouter()


@router.get("", response_model=dict)
async def get_usage(_auth: dict = Depends(verify_clerk)):
    """
    Return current user's scan usage: tier, scans_used, scans_limit, can_scan.
    Used by dashboard and to show paywall when can_scan is false.
    """
    supabase = get_supabase()
    if not supabase:
        lim = starter_monthly_limit()
        return {"tier": "starter", "scans_used": 0, "scans_limit": lim, "can_scan": True, "demo": True}
    user_id = _auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user id")
    return get_scan_usage(supabase, user_id)
