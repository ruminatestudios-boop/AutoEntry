"""
User usage: free scan quota for paywall flow.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.auth import verify_clerk
from app.db import get_supabase, get_scan_usage

router = APIRouter()


@router.get("", response_model=dict)
async def get_usage(_auth: dict = Depends(verify_clerk)):
    """
    Return current user's scan usage: free_scans_used, free_scans_limit (3), can_scan.
    Used by dashboard and to show paywall when can_scan is false.
    """
    supabase = get_supabase()
    if not supabase:
        return {"free_scans_used": 0, "free_scans_limit": 3, "can_scan": True, "demo": True}
    user_id = _auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user id")
    return get_scan_usage(supabase, user_id)
