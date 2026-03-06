"""
Fetch clean product shot image URLs from the web using Gemini (with optional search grounding).
Used by the Confirm listing screen to let users add official/retailer product photos without taking them.
"""
import asyncio
import json
import re
import logging
from typing import List, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# Match the proxy's User-Agent so validation accepts the same URLs the proxy can fetch
_HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}


def _build_image_search_prompt(brand: str, title: str, exact_model: Optional[str] = None) -> str:
    parts = [p for p in [brand, title, (exact_model or "").strip()] if p.strip()]
    product_ref = " ".join(parts) if parts else "this product"
    brand_hint = f" Prefer the official {brand} website (e.g. {brand.lower().replace(' ', '')}.com) product page." if brand.strip() else ""
    return f"""Find 5 high-quality product image URLs for: {product_ref}.{brand_hint}

Search for the official manufacturer or brand product page (e.g. Nike → nike.com product page, Amazon product page). From the product listing or gallery, return only DIRECT URLs to product images: clean product shots on white or neutral background, suitable for a listing. Do not return page URLs—only URLs that point directly to image files.

Return a JSON object only (no markdown, no explanation):
{{
  "image_urls": [
    "https://example.com/path/to/image1.jpg",
    "https://example.com/path/to/image2.png"
  ]
}}

Rules:
- Each URL must be a direct link to an image file (typically ending in .jpg, .jpeg, .png, .webp, or a CDN path that serves image content).
- Prefer official brand or major retailer (Amazon, Nike, etc.) product gallery images.
- Return up to 5 URLs. If you cannot find 5, return as many as you can (minimum 1)."""


def _parse_image_urls_response(text: str) -> List[str]:
    if not text or not text.strip():
        return []
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()
    start = text.find("{")
    if start < 0:
        return []
    depth = 0
    in_string = False
    escape = False
    quote = None
    end = -1
    i = start
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
    if end < 0:
        return []
    try:
        data = json.loads(text[start : end + 1])
        urls = data.get("image_urls") if isinstance(data, dict) else None
        if not isinstance(urls, list):
            return []
        out = []
        for u in urls[:5]:
            if isinstance(u, str) and u.strip().startswith("http"):
                out.append(u.strip())
        return out
    except json.JSONDecodeError:
        return []


def _validate_image_url(url: str, timeout: float = 8.0) -> bool:
    """Return True if url returns 200 and Content-Type is image/*."""
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return False
        host = (parsed.hostname or "").lower()
        if host in ("localhost", "127.0.0.1") or host.startswith("192.168.") or host.startswith("10."):
            return False
        with httpx.Client(follow_redirects=True, timeout=timeout) as client:
            with client.stream("GET", url.strip(), headers=_HTTP_HEADERS) as r:
                if r.status_code != 200:
                    return False
                ct = (r.headers.get("content-type") or "").lower()
                if "image/" not in ct and "octet-stream" not in ct:
                    return False
                return True
    except Exception:
        return False


def _filter_valid_image_urls(urls: List[str], max_check: int = 5) -> List[str]:
    """Return up to max_check URLs that pass _validate_image_url."""
    out = []
    for u in urls[:max_check]:
        if u and isinstance(u, str) and u.strip().startswith("http") and _validate_image_url(u.strip()):
            out.append(u.strip())
            if len(out) >= 5:
                break
    return out


def _fetch_product_images_sync(
    brand: str,
    title: str,
    exact_model: Optional[str],
    gemini_api_key: str,
) -> List[str]:
    import google.generativeai as genai

    genai.configure(api_key=gemini_api_key)
    prompt = _build_image_search_prompt(brand or "", title or "", exact_model)
    for model_name in ("gemini-2.0-flash", "gemini-1.5-flash"):
        try:
            model = genai.GenerativeModel(model_name, tools=["google_search_retrieval"])
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=1024,
                ),
            )
            text = (response.text or "").strip()
            urls = _parse_image_urls_response(text)
            if urls:
                validated = _filter_valid_image_urls(urls)
                return validated if validated else urls
        except Exception as e:
            err = str(e).lower()
            if "not found" in err or "404" in err:
                continue
            logger.warning("Product images fetch failed (%s): %s", model_name, e)
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=0.1,
                        max_output_tokens=1024,
                    ),
                )
                text = (response.text or "").strip()
                urls = _parse_image_urls_response(text)
                if urls:
                    validated = _filter_valid_image_urls(urls)
                    return validated if validated else urls
            except Exception:
                pass
    return []


async def fetch_product_image_urls(
    brand: str,
    title: str,
    exact_model: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
) -> List[str]:
    """
    Return up to 5 image URLs for the product (clean product shots from official/retailer).
    Requires Gemini API key. Returns empty list on failure or missing key.
    """
    if not gemini_api_key or not gemini_api_key.strip():
        return []
    if not (brand or title):
        return []
    return await asyncio.to_thread(
        _fetch_product_images_sync,
        brand or "",
        title or "",
        exact_model,
        gemini_api_key.strip(),
    )
