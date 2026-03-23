"""
Detect scan/OCR titles that are material lines or trademarks — not a real product name.
Used to avoid locking web search onto "GORE-TEX" and to prefer PDP / composite titles.
"""
from __future__ import annotations

import re
from typing import Optional

# Matches titles that start with a material/tech word and are too short to be a full SKU name
_MATERIAL_LEADING_TITLE_RE = re.compile(
    r"^(gore[-\s]?tex|goretex|leather|cotton|nylon|polyester|canvas|mesh|suede|wool|denim|"
    r"fleece|waterproof|breathable)([\s™,.\-®'\"]+[^|]*)?$",
    re.IGNORECASE,
)

# Whole-string material / tech tokens that should never be the sole listing title
_MATERIAL_ONLY_NORMALIZED = frozenset(
    {
        "gore-tex",
        "goretex",
        "gore tex",
        "waterproof",
        "breathable",
        "water resistant",
        "100% cotton",
        "100% polyester",
    }
)


def is_weak_listing_title(title: Optional[str], brand: Optional[str] = None) -> bool:
    """
    True when the string is empty, generic placeholder, a hang-tag material line,
    or **brand-only** (e.g. "Palace") — not a usable product name for search/listings.
    """
    if not title or not str(title).strip():
        return True
    t = str(title).strip()
    low = t.lower()
    b = (brand or "").strip()
    if b and low == b.lower():
        return True
    if low in ("product", "item", "generic product", "unknown product", "nothing"):
        return True
    if low in _MATERIAL_ONLY_NORMALIZED:
        return True
    if _MATERIAL_LEADING_TITLE_RE.match(t) and len(t) < 56:
        return True
    # Single token, short, looks like a trademark line (PALACE would be false — good)
    parts = re.split(r"[\s/]+", t)
    if len(parts) == 1 and len(t) <= 14 and ("-" in t or t.isupper()):
        norm = low.replace("-", "").replace(" ", "")
        if norm in {"goretex", "waterproof", "breathable"} or "gore" in low and "tex" in low and len(t) <= 12:
            return True
    return False


def is_material_trademark_ocr_line(line: str) -> bool:
    """True when an OCR line is only a material / care token — skip as product title candidate."""
    if not line or not line.strip():
        return False
    return is_weak_listing_title(line.strip(), brand=None)
