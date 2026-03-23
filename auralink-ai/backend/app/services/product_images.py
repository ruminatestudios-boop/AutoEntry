"""
Fetch product image URLs from the web using Gemini.
When a reference photo is provided, the prompt targets the same listing gallery / photoshoot
(not random similar products). Uses Google Search grounding when the SDK exposes it.
"""
import asyncio
import base64
import json
import re
import logging
from typing import List, Optional, Tuple, Union
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# Match the proxy's User-Agent so validation accepts the same URLs the proxy can fetch
_HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}

_MAX_REFERENCE_BYTES = 5_000_000


def _is_safe_public_http_url(url: str) -> bool:
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return False
        host = (parsed.hostname or "").lower()
        if host in ("localhost", "127.0.0.1") or host.startswith("192.168.") or host.startswith("10."):
            return False
        if host.startswith("172."):
            octets = host.split(".")
            if len(octets) >= 2 and octets[1].isdigit():
                second = int(octets[1])
                if 16 <= second <= 31:
                    return False
        return True
    except Exception:
        return False


def _decode_base64_image_payload(raw: str) -> Optional[bytes]:
    s = (raw or "").strip()
    if not s:
        return None
    if s.startswith("data:"):
        s = s.split(",", 1)[-1]
    try:
        return base64.b64decode(s, validate=True)
    except Exception:
        return None


def load_reference_image_bytes(
    reference_image_base64: Optional[str],
    reference_image_url: Optional[str],
    mime_hint: str = "image/jpeg",
) -> Tuple[Optional[bytes], str]:
    """
    Load reference image bytes from base64 (optional data URL) or by fetching a public URL.
    Returns (None, mime) on failure. MIME is best-effort for downstream Gemini.
    """
    mime = ((mime_hint or "image/jpeg").split(";")[0]).strip() or "image/jpeg"
    if reference_image_base64 and str(reference_image_base64).strip():
        data = _decode_base64_image_payload(reference_image_base64)
        if data and len(data) <= _MAX_REFERENCE_BYTES:
            return data, mime
        return None, mime
    if reference_image_url and str(reference_image_url).strip():
        url = str(reference_image_url).strip()
        if not _is_safe_public_http_url(url):
            return None, mime
        try:
            with httpx.Client(follow_redirects=True, timeout=20.0) as client:
                with client.stream("GET", url, headers=_HTTP_HEADERS) as r:
                    if r.status_code != 200:
                        return None, mime
                    ct = (r.headers.get("content-type") or "").split(";")[0].strip().lower()
                    if ct.startswith("image/"):
                        mime = ct
                    chunks: List[bytes] = []
                    total = 0
                    for chunk in r.iter_bytes():
                        if not chunk:
                            continue
                        total += len(chunk)
                        if total > _MAX_REFERENCE_BYTES:
                            return None, mime
                        chunks.append(chunk)
                    data = b"".join(chunks)
                    if not data:
                        return None, mime
                    return data, mime
        except Exception as e:
            logger.debug("Reference image URL fetch failed: %s", e)
            return None, mime
    return None, mime


def _build_image_search_prompt(
    brand: str,
    title: str,
    exact_model: Optional[str],
    *,
    has_reference_image: bool,
) -> str:
    parts = [p for p in [brand, title, (exact_model or "").strip()] if p.strip()]
    product_ref = " ".join(parts) if parts else "this product (use the reference image to identify it if needed)"
    brand_hint = (
        f" Prefer the official {brand} site or major retailer PDP for that exact SKU."
        if (brand or "").strip()
        else ""
    )
    if has_reference_image:
        return f"""The user attached a REFERENCE product photo (the image in this request). It is one shot from a product photoshoot or listing gallery.

Task: find up to 5 DIRECT image URLs for MORE photos from the SAME photoshoot / SAME product listing image set—not generic “similar” products from elsewhere on the web.

How to choose URLs:
- Match the reference: same backdrop/surface, lighting, hanger or styling, shadows, and overall color grading.
- Prefer images from the same retailer or brand product detail page gallery (carousel) that clearly belongs with the reference.
- Reject images that are obviously a different shoot: different background color, different studio setup, different model session, heavy watermark from another shop, or a different garment colorway unless it is clearly the same gallery sequence.

Search hints: {product_ref}.{brand_hint}

Return a JSON object only (no markdown, no explanation):
{{
  "image_urls": [
    "https://example.com/path/to/image1.jpg"
  ]
}}

Rules:
- Each URL must point directly to an image file (or CDN URL that returns image bytes).
- If you cannot find same-shoot / same-gallery images, return {{"image_urls": []}}—do not fill with unrelated stock photos.
- Return at most 5 URLs."""

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
- Prefer official brand or major retailer (Amazon, Nike, etc.) product gallery images from the same listing when possible.
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


def _gemini_try_fetch_urls(
    client: object,
    model_name: str,
    contents: Union[str, List[object]],
    use_google_search: bool,
) -> List[str]:
    try:
        from google.genai import types
    except ModuleNotFoundError:
        return []

    tools_list = None
    if use_google_search:
        try:
            tools_list = [types.Tool(google_search=types.GoogleSearch())]
        except Exception as e:
            logger.debug("Google Search tool unavailable for product images: %s", e)
            tools_list = None

    if tools_list:
        cfg = types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=1536,
            tools=tools_list,
        )
    else:
        cfg = types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=1536,
        )
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=cfg,
        )
        text = (getattr(response, "text", None) or "").strip()
        return _parse_image_urls_response(text)
    except Exception as e:
        err = str(e).lower()
        if use_google_search and ("tool" in err or "search" in err or "invalid" in err):
            logger.debug("Product images %s with search failed, caller may retry: %s", model_name, e)
        elif "not found" not in err and "404" not in err:
            logger.warning("Product images fetch failed (%s): %s", model_name, e)
        return []


def _fetch_product_images_sync(
    brand: str,
    title: str,
    exact_model: Optional[str],
    gemini_api_key: str,
    reference_image_bytes: Optional[bytes] = None,
    reference_image_mime_type: str = "image/jpeg",
) -> List[str]:
    try:
        import google.genai as genai
        from google.genai import types
    except ModuleNotFoundError:
        logger.warning("Gemini SDK missing for product images fetch. Install google-genai.")
        return []

    client = genai.Client(api_key=gemini_api_key)
    has_ref = reference_image_bytes is not None and len(reference_image_bytes) > 0
    prompt = _build_image_search_prompt(
        brand or "",
        title or "",
        exact_model,
        has_reference_image=has_ref,
    )
    if has_ref:
        mime = (reference_image_mime_type or "image/jpeg").split(";")[0].strip() or "image/jpeg"
        image_part = types.Part.from_bytes(data=reference_image_bytes, mime_type=mime)
        contents: List[object] = [prompt, image_part]
    else:
        contents = prompt

    for use_search in (True, False):
        for model_name in ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"):
            urls = _gemini_try_fetch_urls(client, model_name, contents, use_search)
            if urls:
                validated = _filter_valid_image_urls(urls)
                return validated if validated else urls
    return []


async def fetch_product_image_urls(
    brand: str,
    title: str,
    exact_model: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    reference_image_bytes: Optional[bytes] = None,
    reference_image_mime_type: str = "image/jpeg",
) -> List[str]:
    """
    Return up to 5 image URLs. With reference_image_bytes, biases toward the same PDP gallery / photoshoot.
    """
    if not gemini_api_key or not gemini_api_key.strip():
        return []
    has_ref = reference_image_bytes is not None and len(reference_image_bytes) > 0
    if not (brand or title) and not has_ref:
        return []
    return await asyncio.to_thread(
        _fetch_product_images_sync,
        brand or "",
        title or "",
        exact_model,
        gemini_api_key.strip(),
        reference_image_bytes,
        reference_image_mime_type or "image/jpeg",
    )
