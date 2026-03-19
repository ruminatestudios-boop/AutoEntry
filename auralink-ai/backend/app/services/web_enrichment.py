"""
Internet-backed product enrichment: use Gemini with Google Search grounding to fetch
exact product name and full listing details from the web, then merge into extraction.
When no web listing is found (e.g. non-famous brand), generate a detailed sales-ready
description from the image extraction so the listing is ready to sell.
"""
import asyncio
import json
import re
import logging
from typing import Optional

from app.schemas.vision import (
    VisionExtractionResponse,
)

logger = logging.getLogger(__name__)

# Minimum length to consider description "substantial" (from web); below this we generate sales-ready copy
MIN_DESCRIPTION_LENGTH = 150

# Generic or placeholder titles we should try to replace with web data
GENERIC_TITLES = {"product", "generic product", "unknown product", "item", "product name", "nothing", ""}


def _build_search_prompt(result: VisionExtractionResponse) -> str:
    """Build a prompt for web search to find exact product name, print/style, and listing details."""
    att = result.attributes
    copy = result.extraction_copy
    tags = result.tags
    brand = (att.brand or "").strip()
    title = (copy.seo_title or "").strip()
    model = (att.exact_model or "").strip()
    category = (tags.category or "").strip()
    product_type = (att.product_type or "").strip()
    parts = [p for p in [brand, title, model, category, product_type] if p]
    product_ref = " ".join(parts) if parts else "this product"
    return f"""Search the internet for this product and return the exact title and best description from real retailer or brand listings: {product_ref}.

Search retailer and brand sites (e.g. Dover Street Market, END, official brand stores, major fashion/tech retailers). Find the actual product page and use the exact title and description as shown there — not just "Brand + product type".

Return:
1. **exact_product_name**: The FULL product title exactly as on the listing. Must include brand, product type, AND the print/style/collection name when present (e.g. "Palace Men's Gore-Tex 2L Jacket K-Nein Print", "Nothing Ear (2) - Wireless Earbuds"). Never return only "Brand Jacket" or "Brand Product"; include the specific model or print name (e.g. "K-Nein Print", "P30JK006") when you find it on retailer/brand pages.
2. **style_print_or_model**: The print name, style code, season, or SKU when visible on the listing (e.g. "K-Nein Print", "P30JK006", "SS26"). null if not found.
3. **full_description**: The best product description from the listing — materials, construction, features. Prefer text from the official or authoritative retailer page (e.g. "Shell: 100% Polyester. Lining: 100% Nylon. Made in China."). Ready to use as the listing description.
4. **bullet_points**: 5–7 short bullet points of key features/specs from the listing.
5. **average_price_gbp**: Always attempt to find pricing. Look at 3–5 separate retailer or marketplace listings for this exact product (or closest match). Compute the average selling price in British Pounds and return that number (e.g. 398). If you find only 1–2 listings, use the average of those. For category-only or generic searches, still return the average price from comparable listings when available. null only if no listings with a price are found.
6. **price_range_gbp** (optional): "min-max" in GBP from the lowest to highest price you saw across those listings (e.g. "385-420"); null if only one price or not found.
7. **category** (optional): Product category as on the listing (e.g. "Men's Jackets", "Wireless Earbuds", "Headphones"). null if not found.

Return ONLY a JSON object (no markdown, no explanation):
{{
  "exact_product_name": "exact full title including brand and print/style",
  "style_print_or_model": "K-Nein Print" or "P30JK006" or null,
  "full_description": "full description from the best listing found",
  "bullet_points": ["feature 1", "feature 2", "…"],
  "average_price_gbp": 398,
  "price_range_gbp": null,
  "category": "Men's Jackets" or null
}}

If you cannot find this product on any retailer or brand site, return: {{ "exact_product_name": null, "style_print_or_model": null, "full_description": null, "bullet_points": null, "average_price_gbp": null, "price_range_gbp": null, "category": null }}."""


def _parse_enrichment_response(text: str) -> Optional[dict]:
    """Parse Gemini's grounded response into enrichment dict; return None on failure."""
    if not text or not text.strip():
        return None
    text = text.strip()
    # Strip markdown code block if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()
    # Try direct parse first
    try:
        data = json.loads(text)
        if isinstance(data, dict) and (
            "exact_product_name" in data
            or "full_description" in data
            or "average_price_gbp" in data
        ):
            return data
    except json.JSONDecodeError:
        pass
    # Extract JSON object from prose: find first { and then matching }
    start = text.find("{")
    if start >= 0:
        depth = 0
        in_string = False
        escape = False
        end = -1
        i = start
        quote = None
        while i < len(text):
            c = text[i]
            if escape:
                escape = False
                i += 1
                continue
            if c == "\\" and in_string:
                escape = True
                i += 1
                continue
            if in_string:
                if c == quote:
                    in_string = False
                i += 1
                continue
            if c in ('"', "'"):
                in_string = True
                quote = c
                i += 1
                continue
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
            i += 1
        if end >= 0:
            try:
                data = json.loads(text[start : end + 1])
                if isinstance(data, dict):
                    return data
            except json.JSONDecodeError:
                pass
    return None


def _build_sales_ready_prompt(result: VisionExtractionResponse) -> str:
    """Build a prompt to generate a detailed, sales-ready description from extraction data."""
    att = result.attributes
    copy = result.extraction_copy
    tags = result.tags
    ffp = copy.description_fact_feel_proof

    parts = []
    if att.brand:
        parts.append(f"Brand: {att.brand}")
    if copy.seo_title:
        parts.append(f"Product / title: {copy.seo_title}")
    if att.exact_model:
        parts.append(f"Model / SKU: {att.exact_model}")
    if tags.category:
        parts.append(f"Category: {tags.category}")
    if att.product_type:
        parts.append(f"Product type: {att.product_type}")
    if att.material_composition or att.material:
        parts.append(f"Material: {att.material_composition or att.material}")
    if att.detected_colors:
        parts.append(f"Colours: {', '.join(att.detected_colors)}")
    if att.dimensions:
        parts.append(f"Dimensions: {att.dimensions}")
    if att.weight or att.weight_grams:
        parts.append(f"Weight: {att.weight or (f'{int(att.weight_grams)}g' if att.weight_grams else '')}")

    if ffp:
        parts.append("")
        parts.append("From image (fact–feel–proof):")
        if ffp.fact:
            parts.append(f"  Fact: {ffp.fact}")
        if ffp.feel:
            parts.append(f"  Feel: {ffp.feel}")
        if ffp.proof:
            parts.append(f"  Proof: {ffp.proof}")

    if copy.bullet_points:
        parts.append("")
        parts.append("Current bullet points from image:")
        for b in copy.bullet_points[:8]:
            parts.append(f"  - {b}")

    context = "\n".join(parts) if parts else "Product details from image (no structured fields)."

    return f"""You are writing product-page copy for an e-commerce listing. Use ONLY the product data below. Do not invent specs or features not implied by the data.

CRITICAL – correct format:
- Write as the brand or retailer would: direct product copy, not an observer describing a photo.
- Do NOT use observational or "what is seen" phrasing. Forbidden: "The jacket features...", "The brand is...", "It is made with...", "This product has...", "The item shows...".
- DO write like real product pages: "Introducing the [Brand] [product name]...", "Crafted from [material]...", "Designed for [use case]...". Use brand and product name naturally in the sentence, not as separate statements ("The brand is X" is wrong; "[X]'s [product]..." or "From [X], ..." is correct).
- Tone: confident, professional, sales-ready. Paragraphs should read as official product description, not a caption of what is in the image.

Product data:
{context}

Output:

1. **description**: Two to four short paragraphs in proper product-listing format (as above). First: intro with brand + product + key material/design. Second: who it's for and benefits. Optional: use cases or care. Roughly 80–180 words total.

2. **bullet_points**: 5–7 short bullet points (features, specs, benefits). One line each; no full sentences. Do not start with "The product has..." or "Features include..."; just the feature or spec itself.

Return ONLY a JSON object (no markdown, no explanation):
{{
  "description": "First paragraph. Second paragraph. Optional third.",
  "bullet_points": ["Feature or spec one", "Feature or spec two", "…"]
}}"""


def _parse_sales_ready_response(text: str) -> Optional[dict]:
    """Parse Gemini response into { description, bullet_points }; return None on failure."""
    if not text or not text.strip():
        return None
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict) and ("description" in data or "bullet_points" in data):
            return data
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    if start >= 0:
        depth = 0
        in_string = False
        escape = False
        end = -1
        i = start
        quote = None
        while i < len(text):
            c = text[i]
            if escape:
                escape = False
                i += 1
                continue
            if c == "\\" and in_string:
                escape = True
                i += 1
                continue
            if in_string:
                if c == quote:
                    in_string = False
                i += 1
                continue
            if c in ('"', "'"):
                in_string = True
                quote = c
                i += 1
                continue
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
            i += 1
        if end >= 0:
            try:
                data = json.loads(text[start : end + 1])
                if isinstance(data, dict):
                    return data
            except json.JSONDecodeError:
                pass
    return None


def _generate_sales_ready_copy_sync(
    result: VisionExtractionResponse,
    gemini_api_key: str,
) -> Optional[dict]:
    """Call Gemini to generate sales-ready description and bullets from extraction; return dict or None."""
    try:
        import google.genai as genai
        from google.genai import types
    except ModuleNotFoundError:
        logger.warning("Gemini SDK missing for web enrichment. Install google-genai.")
        return None
    client = genai.Client(api_key=gemini_api_key)
    prompt = _build_sales_ready_prompt(result)

    for model_name in ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=2048,
                ),
            )
            text = (getattr(response, "text", None) or "").strip()
            data = _parse_sales_ready_response(text)
            if data:
                return data
        except Exception as e:
            logger.warning("Gemini sales-ready copy failed (%s): %s", model_name, e)
            continue
    return None


def _gemini_web_enrich_sync(
    result: VisionExtractionResponse,
    gemini_api_key: str,
) -> Optional[dict]:
    """Try Gemini with Google Search grounding; on failure, retry without tools (model knowledge)."""
    try:
        import google.genai as genai
        from google.genai import types
    except ModuleNotFoundError:
        logger.warning("Gemini SDK missing for web enrichment. Install google-genai.")
        return None
    client = genai.Client(api_key=gemini_api_key)
    prompt = _build_search_prompt(result)

    def _call(tools: Optional[list] = None) -> Optional[dict]:
        for model_name in ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=2048,
                    ),
                )
                text = (getattr(response, "text", None) or "").strip()
                enrichment = _parse_enrichment_response(text)
                if enrichment:
                    return enrichment
            except Exception as e:
                err = str(e).lower()
                if "not found" in err or "404" in err or ("invalid" in err and "model" in err):
                    logger.info("Gemini %s not available: %s", model_name, e)
                    continue
                if tools:
                    logger.info("Gemini with search tool failed (will try without tool): %s", e)
                else:
                    logger.warning("Gemini enrichment failed: %s", e)
                return None
        return None

    # First try with Google Search grounding (real web results)
    out = _call(tools=["google_search_retrieval"])
    if out:
        return out
    # Fallback: same prompt without search tool — use model's product knowledge for exact name and description
    out = _call(tools=None)
    return out


async def _generate_sales_ready_copy_async(
    result: VisionExtractionResponse,
    gemini_api_key: str,
) -> VisionExtractionResponse:
    """Generate sales-ready description and bullets from extraction; merge into result."""
    data = await asyncio.to_thread(
        _generate_sales_ready_copy_sync,
        result,
        gemini_api_key,
    )
    if not data:
        return result
    desc = data.get("description")
    bullets = data.get("bullet_points")
    if desc and isinstance(desc, str) and desc.strip():
        result.extraction_copy.description = desc.strip()
    if bullets and isinstance(bullets, list):
        result.extraction_copy.bullet_points = [str(b).strip() for b in bullets[:10] if b]
    return result


async def enrich_from_web(
    result: VisionExtractionResponse,
    gemini_api_key: Optional[str],
) -> VisionExtractionResponse:
    """
    If we have enough product identifiers and Gemini key is set, call Gemini with
    Google Search grounding to get exact product name and full listing details;
    merge into result and return. When no web listing is found (or no search terms),
    generate a detailed sales-ready description from the image extraction so the
    listing is ready to sell.
    """
    if not gemini_api_key or not gemini_api_key.strip():
        return result

    att = result.attributes
    copy = result.extraction_copy
    tags = result.tags
    has_brand = bool(att.brand and att.brand.strip())
    has_title = bool(copy.seo_title and copy.seo_title.strip().lower() not in GENERIC_TITLES)
    has_model = bool(att.exact_model and att.exact_model.strip())
    has_category = bool(tags.category and tags.category.strip())
    has_product_type = bool(att.product_type and att.product_type.strip())

    # Try web enrichment for all products when we have any searchable signal (brand, title, model, category, or product type)
    if not (has_brand or has_title or has_model or has_category or has_product_type):
        try:
            return await _generate_sales_ready_copy_async(result, gemini_api_key)
        except Exception as e:
            logger.warning("Sales-ready copy generation failed (no search terms): %s", e)
        return result

    enrichment = await asyncio.to_thread(
        _gemini_web_enrich_sync,
        result,
        gemini_api_key,
    )

    if not enrichment:
        try:
            return await _generate_sales_ready_copy_async(result, gemini_api_key)
        except Exception as e:
            logger.warning("Sales-ready copy generation failed (no web result): %s", e)
        return result

    exact_name = enrichment.get("exact_product_name")
    full_desc = enrichment.get("full_description")
    bullets = enrichment.get("bullet_points")
    style_print_or_model = enrichment.get("style_print_or_model")
    web_category = enrichment.get("category")

    sources = dict(result.sources or {})

    if exact_name and isinstance(exact_name, str) and exact_name.strip():
        result.extraction_copy.seo_title = exact_name.strip()[:200]
        sources["seo_title"] = "web"
    if full_desc and isinstance(full_desc, str) and full_desc.strip():
        result.extraction_copy.description = full_desc.strip()
        sources["description"] = "web"
    if bullets and isinstance(bullets, list):
        result.extraction_copy.bullet_points = [str(b).strip() for b in bullets[:10] if b]
        sources["bullet_points"] = "web"
    if style_print_or_model and isinstance(style_print_or_model, str) and style_print_or_model.strip():
        result.attributes.exact_model = style_print_or_model.strip()[:100]
        sources["exact_model"] = "web"
    if web_category and isinstance(web_category, str) and web_category.strip():
        result.tags.category = web_category.strip()[:200]
        sources["category"] = "web"

    result.sources = sources

    # Average price across retailers (GBP) — pre-fill as suggestion (price_source remains not_found so UI can show "Suggested price from web")
    avg_gbp = enrichment.get("average_price_gbp")
    if avg_gbp is not None:
        try:
            val = float(avg_gbp)
            if val > 0:
                result.attributes.price_value = round(val, 2)
                result.attributes.price_display = f"£{int(round(val))}"
                result.price_from_web = True
                # Keep price_source as not_found so UI can show "Suggested price from web" (not from image)
        except (TypeError, ValueError):
            pass
    price_range = enrichment.get("price_range_gbp")
    if price_range and isinstance(price_range, str) and price_range.strip():
        result.price_range_display = price_range.strip()

    # Web did not return a substantial description (e.g. product not found or non-famous brand): generate sales-ready copy
    if len((result.extraction_copy.description or "").strip()) < MIN_DESCRIPTION_LENGTH:
        try:
            result = await _generate_sales_ready_copy_async(result, gemini_api_key)
        except Exception as e:
            logger.warning("Sales-ready copy generation failed (short description): %s", e)

    return result
