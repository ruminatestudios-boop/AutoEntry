"""
Feedback Moat: trigger weekly worker to correlate Shopify orders to performance_logs.
"""
from fastapi import APIRouter, Query

from app.tasks.feedback_tasks import fetch_shopify_orders_and_update_performance_logs

router = APIRouter()


@router.post("/weekly", response_model=dict)
def trigger_weekly_feedback(
    period_start: str = Query(None, description="Period start date YYYY-MM-DD (default: previous week Monday)"),
    period_end: str = Query(None, description="Period end date YYYY-MM-DD (default: previous week Sunday)"),
):
    """
    Trigger the weekly feedback-moat task: fetch Shopify orders for the period,
    join to channel_push_snapshots, upsert into performance_logs.
    When running Celery Beat, this runs automatically every 7 days.
    """
    if period_start and period_end:
        task = fetch_shopify_orders_and_update_performance_logs.delay(
            period_start_iso=f"{period_start}T00:00:00Z",
            period_end_iso=f"{period_end}T23:59:59Z",
        )
    else:
        task = fetch_shopify_orders_and_update_performance_logs.delay()
    return {"task_id": task.id, "status": "queued", "message": "Run Celery worker to process."}
