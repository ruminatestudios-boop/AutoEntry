"""
AI-powered SEO optimization for product listing: analyse title/description and suggest improvements.
"""
import asyncio
import json
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

OPTIMIZE_SYSTEM = """You are an expert at SEO and product listing copy for e‑commerce. Given a product title, description, brand/vendor and category, you write a page title and meta description that sound like how the brand would present the product on their own store: on-brand tone, product name and key benefits clear, suitable for search and for the brand's own product page.

Rules:
- SEO title: concise, include brand name and product name; how the brand would headline this product on their own site; under 70 characters; no filler.
- Meta description: 150–320 characters; as the brand would describe it for search and for their store; benefit and key spec; light call-to-action if it fits the brand.
- Use the vendor/brand name so the listing feels like the brand's own store. Return only valid JSON. No markdown code fences."""

OPTIMIZE_USER_TEMPLATE = """Product details (use these to write as the brand would on their own store):
Title: {title}
Description: {description}
Category: {category}
Vendor/Brand: {vendor}

Write the page title and meta description as this brand would display them on their own store. Return a JSON object with:
1. "seo_title": Page title as the brand would use it (under 70 chars; include brand and product).
2. "meta_description": Meta description as the brand would use it for search and their store (150–320 chars).
3. "analysis": 1–2 sentences on how you matched the brand's style.
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
            "seo_title": (title or "Product")[:70],
            "meta_description": (description or title or "")[:320],
            "analysis": "AI optimization is not configured. Set GEMINI_API_KEY in the backend.",
            "improvements": [],
        }
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        user = OPTIMIZE_USER_TEMPLATE.format(
            title=title or "(none)",
            description=(description or "(none)")[:2000],
            category=category or "(none)",
            vendor=vendor or "(none)",
        )
        response = model.generate_content(
            [OPTIMIZE_SYSTEM, user],
            generation_config=genai.GenerationConfig(temperature=0.3, max_output_tokens=1024),
        )
        text = (response.text or "").strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
        data = json.loads(text)
        seo = (data.get("seo_title") or title or "Product").strip()[:200]
        meta = (data.get("meta_description") or description or "").strip()[:320]
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
            "seo_title": (title or "Product")[:70],
            "meta_description": (description or title or "")[:320],
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
