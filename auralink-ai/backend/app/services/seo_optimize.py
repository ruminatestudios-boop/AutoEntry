"""
AI-powered SEO optimization for product listing: analyse title/description and suggest improvements.
"""
import asyncio
import json
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Google typically shows ~155–160 characters for meta descriptions; title tags ~50–60 visible in SERPs.
SEO_TITLE_MAX = 60
META_DESCRIPTION_MAX = 155


def _clip_at_word(text: str, max_len: int) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip())
    if len(t) <= max_len:
        return t
    cut = t[: max_len + 1]
    last_space = cut.rfind(" ")
    if last_space >= max_len * 2 // 3:
        return t[:last_space].rstrip(".,;:").strip()
    return t[:max_len].rstrip(".,;:").strip()


def _strip_dangling_meta_tail(text: str) -> str:
    x = (text or "").strip()
    prev = None
    while x != prev:
        prev = x
        x = re.sub(r"\s+&\s+\w{0,15}$", "", x, flags=re.I).strip()
        x = re.sub(r"\s+&\s*$", "", x, flags=re.I).strip()
        x = re.sub(r"\s+(and|or)\s+\w{0,15}$", "", x, flags=re.I).strip()
    x = re.sub(r"\s*,\s*$", "", x).strip()
    return x


def clip_seo_title(text: str, max_len: int = SEO_TITLE_MAX) -> str:
    return _clip_at_word(text, max_len)


def clip_meta_description(text: str, max_len: int = META_DESCRIPTION_MAX) -> str:
    """Clip to max_len: prefer sentence end, then word boundary; strip dangling '& a' style tails."""
    t = re.sub(r"\s+", " ", (text or "").strip())
    if not t:
        return ""
    if len(t) <= max_len:
        s0 = _strip_dangling_meta_tail(t)
        if s0 and not re.search(r"[.!?]$", s0) and len(s0) + 1 <= max_len:
            s0 = re.sub(r"[.,;:]+$", "", s0).strip() + "."
        return s0[:max_len].strip()

    segment = t[: max_len + 1]
    best_end = -1
    min_pos = int(max_len * 0.45)
    for i in range(len(segment) - 1, min_pos - 1, -1):
        c = segment[i]
        if c in "!?":
            best_end = i + 1
            break
        if c == ".":
            prev_ch = segment[i - 1] if i > 0 else ""
            next_ch = segment[i + 1] if i + 1 < len(segment) else None
            if prev_ch.isdigit() and next_ch and str(next_ch).isdigit():
                continue
            if next_ch in (" ", None):
                if next_ch == " " and i + 2 < len(segment) and segment[i + 2].islower():
                    continue
                best_end = i + 1
                break

    if best_end > 0 and best_end <= max_len:
        out = segment[:best_end].strip()
    else:
        last_space = segment.rfind(" ")
        if last_space >= (max_len * 2) // 3:
            out = t[:last_space].strip()
        else:
            out = t[:max_len].strip()

    out = re.sub(r"[.,;:]+$", "", out).strip()
    out = _strip_dangling_meta_tail(out)
    if out and not re.search(r"[.!?]$", out) and len(out) + 1 <= max_len:
        out = re.sub(r"[.,;:]+$", "", out).strip() + "."
    if len(out) > max_len:
        sp = out.rfind(" ", 0, max_len + 1)
        if sp >= (max_len * 2) // 3:
            out = out[:sp].strip()
        else:
            out = out[:max_len].strip()
        out = _strip_dangling_meta_tail(re.sub(r"[.,;:]+$", "", out).strip())
    return out


def fallback_meta_from_listing(title: str, description: str) -> str:
    """Short snippet when AI is unavailable — not a dump of the full body."""
    body = re.sub(r"\s+", " ", (description or "").strip())
    t = re.sub(r"\s+", " ", (title or "").strip())
    if body and t:
        return clip_meta_description(f"{t}. {body}")
    return clip_meta_description(body or t)


OPTIMIZE_SYSTEM = """You are an expert at SEO and product listing copy for e‑commerce. Given a product title, description, brand/vendor and category, you write a search-optimized page title and meta description for the product page (e.g. Shopify): on-brand, clear primary keywords, compelling for clicks.

Rules:
- seo_title: Include brand and product name; natural language; **maximum 60 characters** (Google truncates longer titles in results). No ALL CAPS spam, no filler words.
- meta_description: **140–155 characters** — one or two tight sentences: what it is, main benefit or material, optional light CTA (Shop now / Free UK delivery) only if it fits. Do NOT paste the full product description. No duplicate of the title alone.
- Use the vendor/brand name where it helps recognition.
Return only valid JSON. No markdown code fences."""

OPTIMIZE_USER_TEMPLATE = """Product details:
Title: {title}
Description: {description}
Category: {category}
Vendor/Brand: {vendor}

Return a JSON object with:
1. "seo_title": Search-optimized title (max 60 characters; brand + product).
2. "meta_description": Snippet for Google (140–155 characters; not the full description).
3. "analysis": 1–2 sentences on what you optimized.
4. "improvements": Array of 2–4 short bullet points.

Return only the JSON object, no other text."""


def _optimize_seo_sync(
    title: str,
    description: str,
    category: str = "",
    vendor: str = "",
    gemini_api_key: str = "",
) -> dict:
    if not gemini_api_key:
        return {
            "seo_title": clip_seo_title(title or "Product"),
            "meta_description": fallback_meta_from_listing(title, description),
            "analysis": "AI optimization is not configured. Set GEMINI_API_KEY in the backend.",
            "improvements": [],
        }
    try:
        try:
            import google.genai as genai
            from google.genai import types
        except ModuleNotFoundError:
            logger.warning("Gemini SDK missing for SEO optimize. Install google-genai.")
            return {
                "seo_title": clip_seo_title(title or "Product"),
                "meta_description": fallback_meta_from_listing(title, description),
                "analysis": "Gemini SDK missing in backend environment. Install google-genai.",
                "improvements": [],
            }
        client = genai.Client(api_key=gemini_api_key)
        user = OPTIMIZE_USER_TEMPLATE.format(
            title=title or "(none)",
            description=(description or "(none)")[:2000],
            category=category or "(none)",
            vendor=vendor or "(none)",
        )
        text = ""
        last_err = None
        for model_name in ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[OPTIMIZE_SYSTEM, user],
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        max_output_tokens=1024,
                    ),
                )
                text = (getattr(response, "text", None) or "").strip()
                if text:
                    break
            except Exception as e:
                last_err = e
                err = str(e).lower()
                if "404" in err or "not found" in err:
                    continue
                raise
        if not text:
            raise RuntimeError(f"No available Gemini model for SEO optimize: {last_err}")
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
        data = json.loads(text)
        seo = clip_seo_title((data.get("seo_title") or title or "Product").strip())
        meta = clip_meta_description(
            (data.get("meta_description") or fallback_meta_from_listing(title, description)).strip()
        )
        analysis = (data.get("analysis") or "").strip()
        improvements = data.get("improvements")
        if not isinstance(improvements, list):
            improvements = []
        return {
            "seo_title": seo,
            "meta_description": meta,
            "analysis": analysis,
            "improvements": [str(x).strip() for x in improvements if x][:6],
        }
    except Exception as e:
        logger.warning("SEO optimize failed: %s", e)
        return {
            "seo_title": clip_seo_title(title or "Product"),
            "meta_description": fallback_meta_from_listing(title, description),
            "analysis": "Could not run AI optimization. You can edit the fields manually.",
            "improvements": [],
        }


async def optimize_seo_listing(
    title: str,
    description: str,
    category: str = "",
    vendor: str = "",
    gemini_api_key: str = "",
) -> dict:
    return await asyncio.to_thread(
        _optimize_seo_sync,
        title or "",
        description or "",
        category or "",
        vendor or "",
        gemini_api_key or "",
    )
