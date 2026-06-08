"""Stripe Billing Meter events for developer API pay-as-you-go overage."""
from __future__ import annotations

import logging
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

# Display + meter unit weights (1 unit per call; endpoint-specific rates logged in usage table).
METERED_ENDPOINT_GBP: dict[str, float] = {
    "extract": 0.10,
    "market_value": 0.15,
    "classify": 0.05,
    "value": 0.08,
}


def metered_endpoint_units(endpoint: str) -> int:
    """Bill at least 1 meter unit per successful call."""
    return 1


def report_meter_event(stripe_customer_id: str, endpoint: str) -> bool:
    """POST a Stripe Billing Meter event for one overage API call."""
    settings = get_settings()
    secret = (settings.stripe_secret_key or "").strip()
    event_name = (settings.stripe_meter_event_name or "synclyst_api_usage").strip()
    customer_id = (stripe_customer_id or "").strip()
    if not secret or not event_name or not customer_id:
        return False

    try:
        from app.routes.billing import _stripe_http_request

        units = metered_endpoint_units(endpoint)
        resp = _stripe_http_request(
            method="POST",
            url="https://api.stripe.com/v1/billing/meter_events",
            stripe_secret_key=secret,
            data={
                "event_name": event_name,
                "payload[stripe_customer_id]": customer_id,
                "payload[value]": str(units),
            },
        )
        if resp.status_code >= 400:
            logger.warning(
                "Stripe meter event failed (%s): %s",
                resp.status_code,
                resp.text[:200],
            )
            return False
        return True
    except Exception as exc:
        logger.warning("Stripe meter event error: %s", exc)
        return False


def developer_metered_billing(supabase, developer_id: str) -> tuple[bool, Optional[str]]:
    """Return (enabled, stripe_customer_id) for any active key on this developer account."""
    if not supabase or not developer_id:
        return False, None
    try:
        r = (
            supabase.table("developer_api_keys")
            .select(
                "metered_billing_enabled, stripe_customer_id, stripe_subscription_id, plan"
            )
            .eq("developer_id", developer_id)
            .eq("status", "active")
            .execute()
        )
        for row in r.data or []:
            customer_id = (row.get("stripe_customer_id") or "").strip() or None
            if not customer_id:
                continue
            if row.get("metered_billing_enabled"):
                return True, customer_id
            plan = (row.get("plan") or "free").lower()
            if plan == "free" and row.get("stripe_subscription_id"):
                return True, customer_id
        return False, None
    except Exception as exc:
        logger.debug("metered billing lookup failed: %s", exc)
        return False, None
