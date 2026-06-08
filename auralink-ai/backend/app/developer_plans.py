"""Developer API plan limits — single source of truth for backend."""
from __future__ import annotations

from typing import Optional

FREE_MONTHLY_CALLS = 100

PLAN_MONTHLY_LIMITS: dict[str, Optional[int]] = {
    "free": FREE_MONTHLY_CALLS,
    "starter": 1_000,
    "pro": 10_000,
    "enterprise": None,
}

PLAN_MINUTE_LIMITS: dict[str, int] = {
    "free": 10,
    "starter": 30,
    "pro": 100,
    "enterprise": 500,
}

MAX_ACTIVE_KEYS_PER_DEVELOPER = 3

PAID_PLANS = frozenset({"starter", "pro", "enterprise"})
