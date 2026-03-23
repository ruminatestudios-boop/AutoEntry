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

from app.config import Settings
from app.schemas.vision import (
    VisionExtractionResponse,
)
from app.services.product_title_heuristics import is_weak_listing_title
from app.services.web_page_extract import (
    fetch_and_extract_product_copy,
    generic_marketing_score,
    marketplace_boilerplate_score,
    source_quality_tier,
    strip_marketplace_boilerplate,
    url_is_safe_for_fetch,
)

logger = logging.getLogger(__name__)

# Bump when listing merge / guardrails change (client logs + support: "which policy ran").
LISTING_COPY_POLICY_VERSION = "synclyst-listing-v4-2025-03-23"

# Minimum length to consider description "substantial" (from web); below this we generate sales-ready copy
MIN_DESCRIPTION_LENGTH = 150

# Generic or placeholder titles we should try to replace with web data
GENERIC_TITLES = {"product", "generic product", "unknown product", "item", "product name", "nothing", ""}


def _build_scan_profile_for_web(result: VisionExtractionResponse) -> str:
    """Compact signals from the actual image/OCR so search does not latch onto the wrong SKU."""
    att = result.attributes
    copy = result.extraction_copy
    tags = result.tags
    lines: list[str] = []
    if att.product_type:
        lines.append(f"Product type (from image): {att.product_type}")
    if tags and tags.category:
        lines.append(f"Category (from image): {tags.category}")
    if att.material_composition:
        lines.append(f"Materials / composition (from image): {att.material_composition}")
    if att.detected_materials:
        lines.append("Materials mentioned: " + ", ".join(str(m) for m in att.detected_materials[:8] if m))
    if att.detected_colors:
        lines.append("Colours seen: " + ", ".join(str(c) for c in att.detected_colors[:6] if c))
    ffp = copy.description_fact_feel_proof
    if ffp and ffp.fact:
        fact = (ffp.fact or "").strip()
        if len(fact) > 420:
            fact = fact[:417] + "…"
        lines.append(f"What the image shows (fact line): {fact}")
    if copy.bullet_points:
        bp = " | ".join(str(b).strip() for b in copy.bullet_points[:5] if b)
        if bp:
            lines.append(f"Feature bullets from image: {bp}")
    return "\n".join(lines) if lines else ""


def _web_text_conflicts_scan_profile(
    web_title: str,
    web_desc: str,
    result: VisionExtractionResponse,
) -> bool:
    """
    Detect obvious wrong-SKU matches (e.g. web returns a pet coat while the scan is Gore-Tex outerwear).
    When true, discard web title/description/bullets rather than poisoning the listing.
    """
    w = f"{web_title or ''} {web_desc or ''}".lower()
    petish = (
        "dog coat",
        "pet coat",
        "puppy coat",
        "coat for dogs",
        "dog jacket",
        "barbour dog",
        "for dogs",
        "dog's coat",
        "dogs coat",
    )
    if not any(p in w for p in petish):
        return False

    # Dog/cat as **print / graphic** on apparel — not a pet SKU mismatch
    if any(
        x in w
        for x in (
            "graphic print",
            "printed graphic",
            "graphic of",
            "print of",
            "artwork",
            "illustration",
            "dog's head",
            "dog print",
            "dog graphic",
        )
    ) and any(x in w for x in ("jacket", "coat", "shell", "gore-tex", "goretex", "outerwear")):
        return False

    profile = (
        _build_scan_profile_for_web(result)
        + " "
        + " ".join(result.raw_ocr_snippets or [])
        + " "
        + (result.extraction_copy.seo_title or "")
    ).lower()

    if any(x in profile for x in ("dog coat", "pet coat", "for dogs", "puppy")):
        return False

    outerish = (
        "gore-tex",
        "goretex",
        "gore tex",
        " 2l",
        "2l ",
        "p-tek",
        "ptek",
        "p tek",
        "k-nein",
        "k nein",
        "shell jacket",
        "waterproof jacket",
        "nylon jacket",
        "outerwear",
        "doberman",
    )
    if any(o in profile for o in outerish):
        return True
    if "jacket" in profile and "dog" not in profile:
        return True
    return False


def _merge_scan_grounded_details(result: VisionExtractionResponse, description: str) -> str:
    """
    Append a short, scan-specific fact line so reseller listings stay tied to *this* item
    while the body carries canonical product identity from the web.
    """
    if not description or not description.strip():
        return description
    body = strip_marketplace_boilerplate(description.strip())
    if len(body.strip()) < 15 and len(description.strip()) > 35:
        body = description.strip()
    ffp = result.extraction_copy.description_fact_feel_proof
    fact = (ffp.fact or "").strip() if ffp else ""
    if len(fact) < 28:
        return body
    take = fact[:450].rstrip()
    if len(fact) > 450:
        take += "…"
    probe = fact[:min(52, len(fact))].lower().strip()
    if probe and probe in body.lower():
        return body
    return body + "\n\nDetails from your item (scan): " + take


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
    kw = tags.search_keywords if tags and tags.search_keywords else []
    kw_str = ", ".join(str(k).strip() for k in kw[:12] if k) if kw else ""
    ocr_bits = (result.raw_ocr_snippets or [])[:8]
    ocr_str = " | ".join(s.strip() for s in ocr_bits if s and str(s).strip())[:500]

    parts = [p for p in [brand, title, model, category, product_type] if p]
    product_ref = " ".join(parts) if parts else "this product"
    scan_profile = _build_scan_profile_for_web(result)
    extra_lines = []
    if scan_profile:
        extra_lines.append("SCAN PROFILE (from the photo and OCR — the web hit MUST match this product, not a different SKU):\n" + scan_profile)
    if kw_str:
        extra_lines.append(f"Search keywords from the scan: {kw_str}.")
    if ocr_str:
        extra_lines.append(f"Text read from the packaging/label (use for exact spelling): {ocr_str}.")
    if title and (len(title) < 36 or is_weak_listing_title(title, brand or None)):
        extra_lines.append(
            f'Important: The scan\'s working title ("{title}") is likely a material/trademark line or incomplete — '
            "not the full retail product name. Search using brand + model/print/keywords and return the **official** product title from the brand or primary retailer page."
        )
    extra_lines.append(
        "DISAMBIGUATION — read carefully:\n"
        "- The first-line **Product to find** string may be **wrong** (another SKU, wrong collab, or bad VLM guess). **Trust the SCAN PROFILE + OCR + keywords** over that string when they conflict.\n"
        "- Do **not** return a listing for a **different product category** (e.g. pet coat, dog accessory, unrelated collaboration) if the scan profile clearly describes **outerwear / jacket / shell / Gore-Tex** (or another specific category).\n"
        "- If you find multiple listings for the same brand, pick the one whose **title and specs match** the scan profile (e.g. Gore-Tex 2L, P-Tek, named print codes like K-Nein, jacket vs coat type).\n"
        "- When in doubt between two products, prefer the **official brand PDP** that matches materials and product class from the scan profile.\n"
        "- If no listing matches the scan profile, return **null** for exact_product_name and full_description rather than forcing an unrelated product."
    )
    extra_block = ("\n" + "\n".join(extra_lines)) if extra_lines else ""

    return f"""You have Google Search. Find this product online using the brand, name, model, and keywords below. Prioritize the **official brand site**, then major retailers (Amazon, END., SSENSE, Mercari listings that match the same SKU, etc.).

Initial search string (may be incomplete or wrong — use SCAN PROFILE to correct): {product_ref}.{extra_block}

CRITICAL — title must match the web, not paraphrase:
- **exact_product_name** must be copied **verbatim** from a real product page (H1, title tag, or main product name on the listing). Same spelling, capitalization, punctuation, and ™/® if shown there.
- Prefer the **manufacturer / brand official** listing when it exists; otherwise the clearest major-retailer match for the **same SKU/model/line**.
- If the scan title (e.g. from packaging) appears on a product page, **that string should match** the listing title when it is the same product — do not shorten to a generic phrase like "Brand Water Bottle" if the site uses a longer official name.
- Do not invent a title. If you cannot find a matching product page, return exact_product_name: null.
- **Title shape:** When the real listing uses a technical name, mirror it — e.g. "Palace Gore-tex 2L P-Tek Jacket K-Nein" (brand + tech + line + garment + print/code). Do not collapse to a vague "Brand x Brand Dog Coat" unless the scan profile is actually that product.

Search retailer and brand sites. Find the actual product page and use the exact title and description as shown there — not just "Brand + product type".

DESCRIPTION (most important — must read like the real product page, not generic AI blurbs):
- **full_description** must come from the **official brand e-commerce site** for this product when one exists (e.g. brand.com / regional shop subdomain). Open that product URL and **reuse the site’s own long-form copy**: main product blurb, “Details”, “Features”, composition / materials lines, fit notes, care, and any **named print/collab/story** text as the brand wrote it.
- **Copy verbatim or stitch contiguous paragraphs** from that page. Preserve **technical claims** (e.g. GORE-TEX®, waterproof/breathable), **material percentages**, **style codes**, and **named graphics/prints** exactly as published.
- **Do not** replace brand copy with generic filler such as: “Designed for those who appreciate…”, “Ideal for urban exploration”, “Stay protected from the elements in style”, “perfect for everyday wear”, unless that **exact** phrasing appears on the official page. If the official page is minimal, combine **all** factual sentences from the page before inventing anything — and if the page still has almost no text, return a **short** description made **only** from specs visible on that page (still no generic lifestyle paragraphs).
- If the official site has no product page but a **flagship retailer** (END., Dover Street Market, etc.) reproduces **identical** brand-supplied copy, you may use that text; otherwise prefer the closest page that **quotes** brand copy. Do **not** paraphrase into a generic third-person “this jacket features…” essay unless you are directly transcribing the site’s wording.
- **Never** start `full_description` with marketplace framing such as: “Shop the … on GOAT”, “curated styles from … on GOAT”, “Buyer protection guaranteed”, StockX intros, or eBay seller boilerplate. If you only see that text, return **null** for `full_description` and still return `source_urls` to the **brand official PDP** or a retailer that uses brand copy.

Return:
1. **exact_product_name**: The FULL product title **exactly** as on the listing (verbatim from the page). Must include brand, product type, AND the print/style/collection name when present (e.g. "Palace Men's Gore-Tex 2L Jacket K-Nein Print", "Nothing Ear (2) - Wireless Earbuds"). Never return only "Brand Jacket" or "Brand Product"; include the specific model or print name (e.g. "K-Nein Print", "P30JK006") when you find it on retailer/brand pages.
2. **style_print_or_model**: The print name, style code, season, or SKU when visible on the listing (e.g. "K-Nein Print", "P30JK006", "SS26"). null if not found.
3. **full_description**: **Primary:** full product description **as on the official brand product page** (see rules above). Include materials, construction, named design/print, and any **real-world use / positioning** sentences **only if they appear on that page**. Target **at least** ~200 characters when the site provides enough text; if the site is shorter, return everything substantive the page offers without padding.
4. **bullet_points**: 5–7 bullets **taken from the same source** as the description (official product page spec list or feature list). Same wording as the site where possible — not invented marketing bullets.
5. **average_price_gbp**: Always attempt to find pricing. Look at 3–5 separate retailer or marketplace listings for this exact product (or closest match). Compute the average selling price in British Pounds and return that number (e.g. 398). If you find only 1–2 listings, use the average of those. For category-only or generic searches, still return the average price from comparable listings when available. null only if no listings with a price are found.
6. **price_range_gbp** (optional): "min-max" in GBP from the lowest to highest price you saw across those listings (e.g. "385-420"); null if only one price or not found.
7. **category** (optional): Product category as on the listing (e.g. "Men's Jackets", "Wireless Earbuds", "Headphones"). null if not found.
8. **primary_product_url** (optional): Single **https** URL of the **exact** product detail page whose title/description you used (official brand PDP preferred). Not a search page, category, or image URL.
9. **source_urls** (optional): 1–3 **https** URLs of the same product PDPs (brand shop first, then flagship retailers). Same constraints as primary_product_url. If you are unsure of verbatim copy, still return these URLs so the system can fetch the real page text.

Return ONLY a JSON object (no markdown, no explanation):
{{
  "exact_product_name": "exact full title including brand and print/style",
  "style_print_or_model": "K-Nein Print" or "P30JK006" or null,
  "full_description": "full description from the best listing found",
  "bullet_points": ["feature 1", "feature 2", "…"],
  "average_price_gbp": 398,
  "price_range_gbp": null,
  "category": "Men's Jackets" or null,
  "primary_product_url": "https://..." or null,
  "source_urls": ["https://...", "https://..."] or null
}}

If you cannot find this product on any retailer or brand site, return: {{ "exact_product_name": null, "style_print_or_model": null, "full_description": null, "bullet_points": null, "average_price_gbp": null, "price_range_gbp": null, "category": null, "primary_product_url": null, "source_urls": null }}."""


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


def _parse_json_dict(text: str) -> Optional[dict]:
    """Parse first JSON object from model text (any keys)."""
    if not text or not text.strip():
        return None
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
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


def _urls_from_enrichment(enrichment: dict, brand_hint: Optional[str] = None) -> list[str]:
    """Collect https PDP URLs from Gemini JSON (deduped); official brand hosts first."""
    out: list[str] = []
    primary = enrichment.get("primary_product_url")
    if isinstance(primary, str) and primary.strip().lower().startswith("https://"):
        out.append(primary.strip())
    for key in ("source_urls", "product_page_urls"):
        v = enrichment.get(key)
        if isinstance(v, list):
            for x in v:
                if x and str(x).strip().lower().startswith("https://"):
                    out.append(str(x).strip())
        elif isinstance(v, str) and v.strip().lower().startswith("https://"):
            out.append(v.strip())
    seen: set[str] = set()
    uniq: list[str] = []
    for u in out:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    safe = [u for u in uniq if url_is_safe_for_fetch(u)][:8]
    safe.sort(key=lambda u: (source_quality_tier(u, brand_hint), u))
    return safe[:6]


def _build_url_discovery_prompt(result: VisionExtractionResponse) -> str:
    """Minimal prompt: return only product page URLs for server-side fetch."""
    att = result.attributes
    copy = result.extraction_copy
    tags = result.tags
    brand = (att.brand or "").strip()
    title = (copy.seo_title or "").strip()
    model = (att.exact_model or "").strip()
    scan_profile = _build_scan_profile_for_web(result)
    ocr_bits = (result.raw_ocr_snippets or [])[:6]
    ocr_str = " | ".join(s.strip() for s in ocr_bits if s and str(s).strip())[:400]
    parts = [p for p in [brand, title, model] if p]
    product_ref = " ".join(parts) if parts else "this product"
    block = ""
    if scan_profile:
        block = "\n\nSCAN PROFILE (PDP must match this product, not a different SKU):\n" + scan_profile
    if ocr_str:
        block += f"\n\nOCR / label text: {ocr_str}"
    return f"""You have Google Search. Find **direct HTTPS product detail pages** (PDP) for this exact item.

Product: {product_ref}.{block}

Rules:
- Return **only** canonical product URLs (path to one SKU), not search results, category listings, or Google image links.
- Prefer **official brand e-commerce** first, then END., SSENSE, Dover Street Market, or the brand's regional shop.
- Deprioritize GOAT / StockX / Grailed / eBay **unless** no brand or boutique PDP exists (those pages often add marketplace SEO, not clean product copy).
- 2–4 URLs maximum. If you cannot find any confident PDP, return null.

Return ONLY JSON (no markdown):
{{{{ "product_page_urls": ["https://...", "https://..."] }}}}
or {{{{ "product_page_urls": null }}}}"""


def _parse_url_discovery_response(text: str) -> list[str]:
    data = _parse_json_dict(text)
    if not data:
        return []
    raw = data.get("product_page_urls")
    if not isinstance(raw, list):
        return []
    out = [str(x).strip() for x in raw if x and str(x).strip().lower().startswith("https://")]
    return [u for u in out if url_is_safe_for_fetch(u)][:5]


def _gemini_discover_product_urls_sync(
    result: VisionExtractionResponse,
    gemini_api_key: str,
) -> list[str]:
    try:
        import google.genai as genai
        from google.genai import types
    except ModuleNotFoundError:
        return []
    client = genai.Client(api_key=gemini_api_key)
    prompt = _build_url_discovery_prompt(result)
    tools_list = None
    try:
        tools_list = [types.Tool(google_search=types.GoogleSearch())]
    except Exception as e:
        logger.warning("URL discovery: no Google Search tool: %s", e)
        return []
    for model_name in ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=1024,
                    tools=tools_list,
                ),
            )
            text = (getattr(response, "text", None) or "").strip()
            urls = _parse_url_discovery_response(text)
            if urls:
                logger.info("URL discovery found %d candidate PDP(s)", len(urls))
                return urls
        except Exception as e:
            logger.debug("URL discovery %s failed: %s", model_name, e)
            continue
    return []


def _gemini_template_paraphrase(gemini_text: Optional[str]) -> bool:
    """Heuristic: model wrote a generic 'this jacket features…' blurb vs real PDP copy."""
    if not gemini_text or not str(gemini_text).strip():
        return False
    low = str(gemini_text).lower()
    if re.search(r"\bthis\s+.+?\s+jacket\s+features\b", low):
        return True
    if "designed for those who appreciate" in low or "designed for those who want" in low:
        return True
    if "ideal for urban exploration" in low or "streetwear enthusiasts" in low:
        return True
    if "make a bold statement" in low or "bold statement" in low:
        return True
    if "unpredictable weather conditions" in low and "urban exploration" in low:
        return True
    return False


def _ffp_stitch_description(result: VisionExtractionResponse) -> str:
    """Prefer vision fact–feel–proof / bullets over template LLM blurbs."""
    copy = result.extraction_copy
    ffp = copy.description_fact_feel_proof
    parts: list[str] = []
    if ffp:
        for bit in (ffp.fact, ffp.feel, ffp.proof):
            if bit and str(bit).strip():
                parts.append(str(bit).strip())
    if parts:
        return "\n\n".join(parts)
    if copy.bullet_points:
        return "\n".join(str(b).strip() for b in copy.bullet_points[:10] if b)
    return (copy.description or "").strip()


def _prefer_page_over_gemini(
    page_text: str,
    page_score: float,
    gemini_text: Optional[str],
    gemini_score: float,
) -> bool:
    """True when fetched PDP text is likely more faithful than model paraphrase."""
    pt = (page_text or "").strip()
    if len(pt) < 80:
        return False
    gt = (gemini_text or "").strip()
    if not gt:
        return len(pt) >= 100
    if _gemini_template_paraphrase(gt) and len(pt) >= 70:
        return page_score < 0.9
    # Page clearly less generic
    if page_score + 0.12 < gemini_score and len(pt) >= 100:
        return True
    if len(pt) >= 200 and page_score < 0.35 and (gemini_score > 0.22 or len(gt) < len(pt) * 0.65):
        return True
    return False


async def _gather_page_descriptions(
    urls: list[str],
    timeout_sec: float,
    max_bytes: int,
) -> list[tuple[str, str, Optional[str], float]]:
    """Fetch URLs in parallel; return list of (url, description, page_title, generic_score)."""

    async def one(u: str) -> Optional[tuple[str, str, Optional[str], float]]:
        text, ptitle = await asyncio.to_thread(
            fetch_and_extract_product_copy,
            u,
            timeout_sec,
            max_bytes,
        )
        # After marketplace strip, some PDPs only leave specs (e.g. "Material: Gore-Tex") — still useful with scan merge.
        if not text or len(text.strip()) < 12:
            return None
        text = text.strip()
        title_clean = (ptitle or "").strip()[:200] if ptitle else None
        return (u, text, title_clean or None, generic_marketing_score(text))

    results = await asyncio.gather(*(one(u) for u in urls))
    return [r for r in results if r is not None]


def _pick_best_fetched_page(
    candidates: list[tuple[str, str, Optional[str], float]],
    web_title: str,
    result: VisionExtractionResponse,
) -> Optional[tuple[str, str, Optional[str], float]]:
    """Prefer official brand PDP, then clean retailer copy; downrank marketplace wrapper pages."""
    brand = (result.attributes.brand or "").strip()
    scored: list[tuple[str, str, Optional[str], float, int, float]] = []
    for u, text, ptitle, gscore in candidates:
        if _web_text_conflicts_scan_profile(web_title or "", text, result):
            continue
        tier = source_quality_tier(u, brand)
        mb = marketplace_boilerplate_score(text)
        combined = gscore + mb * 0.55
        scored.append((u, text, ptitle, gscore, tier, combined))
    if not scored:
        return None
    scored.sort(key=lambda x: (x[4], x[5], x[3], -len(x[1])))
    best = scored[0]
    return (best[0], best[1], best[2], best[3])


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
- Do NOT use observational or "what is seen" phrasing. Forbidden: "The jacket features...", "This PALACE jacket features...", "The brand is...", "It is made with...", "This product has...", "The item shows...", "Designed for those who want...", "make a bold statement", "streetwear enthusiasts", "urban exploration" as filler.
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

    def _call(use_google_search: bool) -> Optional[dict]:
        tools_list = None
        if use_google_search:
            try:
                tools_list = [types.Tool(google_search=types.GoogleSearch())]
            except Exception as e:
                logger.warning("Could not build Google Search tool: %s", e)
                return None
        for model_name in ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"):
            try:
                if tools_list:
                    cfg = types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=2048,
                        tools=tools_list,
                    )
                else:
                    cfg = types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=2048,
                    )
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=cfg,
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
                logger.info(
                    "Gemini %s web enrich failed (search=%s): %s",
                    model_name,
                    use_google_search,
                    e,
                )
                continue
        return None

    # First: Google Search grounding (real web pages) for verbatim titles
    out = _call(use_google_search=True)
    if out:
        return out
    # Fallback: no tool — model knowledge only (worse for exact retail titles)
    out = _call(use_google_search=False)
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
        d = desc.strip()
        if (
            generic_marketing_score(d) > 0.28
            or _gemini_template_paraphrase(d)
        ):
            alt = _ffp_stitch_description(result)
            if len(alt.strip()) >= 40:
                result.extraction_copy.description = _merge_scan_grounded_details(result, alt.strip())
                src = dict(result.sources or {})
                src["description"] = "vision_grounded"
                result.sources = src
            else:
                result.extraction_copy.description = d
        else:
            result.extraction_copy.description = d
    if bullets and isinstance(bullets, list):
        result.extraction_copy.bullet_points = [str(b).strip() for b in bullets[:10] if b]
    src = dict(result.sources or {})
    src["copy_policy_version"] = LISTING_COPY_POLICY_VERSION
    result.sources = src
    return result


async def enrich_from_web(
    result: VisionExtractionResponse,
    settings: Settings,
) -> VisionExtractionResponse:
    """
    Gemini + Google Search for title/bullets/price, then optional HTTPS fetch of PDP HTML
    (JSON-LD / Open Graph) when that yields less generic, more faithful copy.
    """
    gemini_api_key = settings.gemini_api_key
    if not gemini_api_key or not gemini_api_key.strip():
        return result

    att = result.attributes
    copy = result.extraction_copy
    tags = result.tags
    scan_brand = (att.brand or "").strip()
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

    if exact_name and isinstance(exact_name, str) and exact_name.strip():
        fd = str(full_desc).strip() if full_desc else ""
        if _web_text_conflicts_scan_profile(exact_name, fd, result):
            logger.warning(
                "Web enrichment discarded: listing looks like wrong SKU vs scan (e.g. pet product vs jacket)."
            )
            exact_name = None
            full_desc = None
            bullets = None
            style_print_or_model = None
            web_category = None

    if full_desc and isinstance(full_desc, str) and full_desc.strip():
        raw_fd = full_desc.strip()
        cleaned_fd = strip_marketplace_boilerplate(raw_fd)
        full_desc = cleaned_fd if len(cleaned_fd) >= 40 else raw_fd

    gemini_desc_str = (
        str(full_desc).strip()
        if full_desc and isinstance(full_desc, str)
        else ""
    )
    gemini_score = generic_marketing_score(gemini_desc_str)
    pre_web_title = (copy.seo_title or "").strip()

    page_choice: Optional[tuple[str, str, Optional[str], float]] = None
    if settings.enable_web_page_fetch:
        urls = _urls_from_enrichment(enrichment, scan_brand or None)
        if not urls:
            # Extra Search when no PDP links and description/title signal is weak.
            weak_title = is_weak_listing_title(pre_web_title, scan_brand or None)
            needs_discovery = (
                not gemini_desc_str
                or len(gemini_desc_str) < MIN_DESCRIPTION_LENGTH
                or gemini_score > 0.32
                or weak_title
            )
            if needs_discovery:
                try:
                    discovered = await asyncio.to_thread(
                        _gemini_discover_product_urls_sync,
                        result,
                        gemini_api_key,
                    )
                    urls = list(discovered)
                    urls.sort(key=lambda u: (source_quality_tier(u, scan_brand or None), u))
                except Exception as e:
                    logger.debug("URL discovery failed: %s", e)
        if urls:
            try:
                candidates = await _gather_page_descriptions(
                    urls[:4],
                    settings.web_page_fetch_timeout_sec,
                    settings.web_page_fetch_max_bytes,
                )
                title_for_pick = (exact_name or copy.seo_title or "").strip()
                page_choice = _pick_best_fetched_page(candidates, title_for_pick, result)
            except Exception as e:
                logger.warning("Page fetch stage failed: %s", e)

    citation_url: Optional[str] = None
    page_title_merge: Optional[str] = None
    if page_choice:
        u, ptext, ptitle, pscore = page_choice
        if ptitle and len(ptitle.strip()) > 8:
            page_title_merge = ptitle.strip()[:200]
        if _prefer_page_over_gemini(ptext, pscore, gemini_desc_str or None, gemini_score):
            full_desc = ptext
            citation_url = u
            logger.info("Using PDP-extracted description (%d chars) over Gemini paraphrase", len(ptext))
        elif not gemini_desc_str and len(ptext.strip()) >= 12:
            full_desc = ptext
            citation_url = u
            logger.info("Using PDP-extracted description (Gemini returned no description)")

    sources = dict(result.sources or {})
    description_from_web = False

    has_exact = bool(exact_name and isinstance(exact_name, str) and exact_name.strip())
    if has_exact:
        result.extraction_copy.seo_title = exact_name.strip()[:200]
        sources["seo_title"] = "web"
    elif page_title_merge and (
        is_weak_listing_title(pre_web_title, scan_brand or None)
        or (not has_exact and len(page_title_merge) > len(pre_web_title) + 6)
    ):
        result.extraction_copy.seo_title = page_title_merge
        sources["seo_title"] = "web_page"
    if is_weak_listing_title((result.extraction_copy.seo_title or "").strip(), scan_brand or None):
        kws = [str(k).strip() for k in (result.tags.search_keywords or [])[:8] if k and str(k).strip()]
        bl = (scan_brand or "").lower()
        tail_parts = [x for x in kws if x.lower() != bl and bl not in x.lower() and x.lower() not in bl][:5]
        if scan_brand and tail_parts:
            merged_kw = (scan_brand + " " + " ".join(tail_parts)).strip()[:200]
            if len(merged_kw.split()) >= 2:
                result.extraction_copy.seo_title = merged_kw
                if sources.get("seo_title") not in ("web", "web_page"):
                    sources["seo_title"] = "derived_keywords"
    if full_desc and isinstance(full_desc, str) and full_desc.strip():
        result.extraction_copy.description = _merge_scan_grounded_details(result, full_desc.strip())
        sources["description"] = "web_page" if citation_url else "web"
        if citation_url:
            sources["description_url"] = citation_url[:500]
            sources["listing_copy_host_tier"] = str(source_quality_tier(citation_url, scan_brand or None))
        description_from_web = True
    # Gemini-only web body often relapses into template blurbs — prefer vision FFP when detected.
    if description_from_web and sources.get("description") == "web":
        body = (result.extraction_copy.description or "").strip()
        if _gemini_template_paraphrase(body) or generic_marketing_score(body) > 0.32:
            alt = _ffp_stitch_description(result)
            if len(alt.strip()) >= 45:
                result.extraction_copy.description = _merge_scan_grounded_details(result, alt.strip())
                sources["description"] = "vision_grounded"
                sources.pop("description_url", None)
                sources.pop("listing_copy_host_tier", None)
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
    result.sources["copy_policy_version"] = LISTING_COPY_POLICY_VERSION

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

    # Only synthesize sales-ready copy when web did not supply a description (never overwrite real brand-page text).
    if not description_from_web and len((result.extraction_copy.description or "").strip()) < MIN_DESCRIPTION_LENGTH:
        try:
            result = await _generate_sales_ready_copy_async(result, gemini_api_key)
        except Exception as e:
            logger.warning("Sales-ready copy generation failed (short description): %s", e)

    return result
