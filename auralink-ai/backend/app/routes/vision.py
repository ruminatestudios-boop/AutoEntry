"""
Vision extraction: MultimodalProcessor → UCP/schema.org attributes, Fact-Feel-Proof copy.
"""
import base64
import logging
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import ValidationError
import httpx

from app.auth import optional_verify_clerk
from app.db import get_supabase, get_scan_usage, increment_free_scan, FREE_SCANS_LIMIT
from app.schemas.vision import VisionExtractionRequest, VisionExtractionResponse, FetchProductImagesRequest, OptimizeSeoRequest, OptimizeSeoResponse
from app.services.vision_service import MultimodalProcessor, get_synthetic_ocr, get_dummy_extraction, get_fallback_extraction, apply_post_extraction
from app.services.ocr_service import (
    run_ocr_google,
    run_ocr_tesseract,
    enrich_attributes_from_ocr,
    best_brand_and_title_from_ocr,
)
from app.services.web_enrichment import enrich_from_web
from app.services.product_images import fetch_product_image_urls
from app.services.seo_optimize import optimize_seo_listing

logger = logging.getLogger(__name__)

router = APIRouter()
_processor = MultimodalProcessor()


def _decode_base64(image_base64: str) -> bytes:
    data = image_base64.strip()
    if data.startswith("data:"):
        data = data.split(",", 1)[-1]
    return base64.b64decode(data, validate=True)


def _resize_image_if_large(image_base64: str, mime: str, max_px: int = 720, max_bytes: int = 350_000) -> str:
    """Resize image to max_px on longest side and re-encode as JPEG for faster vision API calls. Returns base64."""
    try:
        raw = _decode_base64(image_base64)
        payload = image_base64.split(",", 1)[-1].strip() if image_base64.strip().startswith("data:") else image_base64.strip()
        if len(raw) <= max_bytes:
            try:
                from PIL import Image
                import io
                img = Image.open(io.BytesIO(raw))
                w, h = img.size
                if max(w, h) <= max_px:
                    return payload
            except Exception:
                return payload
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(raw))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        w, h = img.size
        if max(w, h) <= max_px and len(raw) <= max_bytes:
            return payload
        scale = max_px / max(w, h)
        new_w, new_h = int(round(w * scale)), int(round(h * scale))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=85, optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        logger.debug("Resize image skip: %s", e)
    return image_base64.split(",", 1)[-1].strip() if image_base64.strip().startswith("data:") else image_base64.strip()


@router.post("/extract")
async def extract(request: VisionExtractionRequest, _auth: dict = Depends(optional_verify_clerk)):
    """
    Extract full product profile from one image (UCP + schema.org/Product).
    Returns JSON: attributes, extraction_copy, tags, raw_ocr_snippets, confidence_score.
    When no Vision API key is set (demo mode), returns a fixed dummy extraction.
    """
    from app.config import get_settings
    settings = get_settings()
    has_gemini = bool(settings.gemini_api_key)
    has_openai = bool(settings.openai_api_key)
    use_dummy = (settings.vision_provider == "gemini" and not has_gemini) or (
        settings.vision_provider == "openai" and not has_openai
    )
    if use_dummy:
        return get_dummy_extraction().model_dump()

    supabase = get_supabase()
    user_id = _auth.get("sub") if _auth else None
    if user_id and supabase:
        usage = get_scan_usage(supabase, user_id)
        if not usage["can_scan"]:
            raise HTTPException(
                status_code=402,
                detail=f"You've used all {FREE_SCANS_LIMIT} free scans. Upgrade to continue.",
            )

    raw_b64 = request.image_base64
    mime = request.mime_type or "image/jpeg"
    ocr_snippets: list[str] = []
    raw_bytes: bytes = b""

    # Resize early so OCR and vision both run on smaller image (faster, especially on mobile)
    raw_b64 = _resize_image_if_large(raw_b64, mime)

    if request.include_ocr:
        try:
            raw_bytes = _decode_base64(raw_b64)
        except Exception:
            pass
        if raw_bytes:
            try:
                ocr_snippets = await run_ocr_google(raw_bytes)
            except Exception:
                pass
        if not ocr_snippets and raw_bytes:
            import asyncio
            ocr_snippets = await asyncio.to_thread(run_ocr_tesseract, raw_bytes)
        if not ocr_snippets:
            ocr_snippets = await get_synthetic_ocr(raw_b64, mime)

    # Already resized above for both OCR and vision
    try:
        result = await _processor.process(
            image_base64=raw_b64,
            mime_type=mime,
            ocr_snippets=ocr_snippets or None,
        )
    except ValidationError as e:
        logger.warning("Vision extraction validation error, returning fallback: %s", e)
        result = get_fallback_extraction()
    except Exception as e:
        logger.exception("Vision extraction failed")
        from app.config import get_settings
        s = get_settings()
        if not s.gemini_api_key and s.vision_provider != "openai":
            raise HTTPException(
                status_code=503,
                detail="Vision API not configured. Set GEMINI_API_KEY in backend .env to use image extraction.",
            )
        if not s.openai_api_key and s.vision_provider == "openai":
            raise HTTPException(
                status_code=503,
                detail="Vision API not configured. Set OPENAI_API_KEY in backend .env.",
            )
        err_msg = str(e)
        if "API_KEY_INVALID" in err_msg or "403" in err_msg or "invalid" in err_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Gemini API key invalid or restricted. Check GEMINI_API_KEY in backend .env and ensure the Generative Language API is enabled in Google Cloud / AI Studio.",
            )
        if "429" in err_msg or "quota" in err_msg.lower() or "resource exhausted" in err_msg.lower():
            raise HTTPException(status_code=503, detail="Gemini quota exceeded. Try again later or check your Google Cloud quota.")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {err_msg}")

    # Enrich material/brand from OCR if not already set
    mat, brand = enrich_attributes_from_ocr(
        ocr_snippets,
        current_material=result.attributes.material,
        current_brand=result.attributes.brand,
    )
    if mat and not result.attributes.material:
        result.attributes.material = mat
    if brand and not result.attributes.brand:
        result.attributes.brand = brand

    # Prefer OCR-derived brand and title: trust label text over model when we have a clear OCR line
    generic_titles = {"product", "generic product", "unknown product", "item", "product name", ""}
    brand_cand, title_cand = best_brand_and_title_from_ocr(ocr_snippets)
    if brand_cand:
        result.attributes.brand = brand_cand
    if title_cand and (not result.extraction_copy.seo_title or result.extraction_copy.seo_title.strip().lower() in generic_titles):
        result.extraction_copy.seo_title = title_cand

    result.raw_ocr_snippets = ocr_snippets[:20]

    result = apply_post_extraction(result)

    # If category looks like "BRAND > Type", ensure brand is set for web enrichment
    if not result.attributes.brand and result.tags.category and ">" in result.tags.category:
        result.attributes.brand = result.tags.category.split(">")[0].strip()

    # Internet-backed enrichment: fetch exact product name and full listing details from the web
    if not request.skip_web_enrichment and settings.enable_web_enrichment and settings.gemini_api_key:
        try:
            result = await enrich_from_web(result, settings.gemini_api_key)
        except Exception as e:
            logger.warning("Web enrichment failed (using image-only result): %s", e)

    # Count this scan for authenticated user
    if user_id and supabase:
        increment_free_scan(supabase, user_id)

    # Return as dict to avoid FastAPI re-validating and triggering "copy" validation errors
    return result.model_dump()


@router.post("/fetch-product-images")
async def fetch_product_images(
    request: FetchProductImagesRequest,
    _auth: dict = Depends(optional_verify_clerk),
):
    """
    Search the web for clean product shot image URLs (official/retailer) and return up to 5.
    Requires Gemini API key. Used by Confirm listing to add photos without the user taking them.
    """
    from app.config import get_settings
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=503,
            detail="Product image search is not configured. Set GEMINI_API_KEY in backend .env.",
        )
    brand = (request.brand or "").strip()
    title = (request.title or "").strip()
    if not title and not brand:
        return {"image_urls": []}
    urls = await fetch_product_image_urls(
        brand=brand,
        title=title,
        exact_model=request.exact_model if request.exact_model else None,
        gemini_api_key=settings.gemini_api_key,
    )
    return {"image_urls": urls}


@router.post("/optimize-seo", response_model=OptimizeSeoResponse)
async def optimize_seo(
    request: OptimizeSeoRequest,
    _auth: dict = Depends(optional_verify_clerk),
):
    """
    Analyse the product title and description and return AI-optimised SEO title and meta description,
    plus a short analysis and list of improvements. Uses Gemini when GEMINI_API_KEY is set.
    """
    from app.config import get_settings
    settings = get_settings()
    result = await optimize_seo_listing(
        title=request.title or "",
        description=request.description or "",
        category=request.category or "",
        vendor=request.vendor or "",
        gemini_api_key=settings.gemini_api_key or "",
    )
    return OptimizeSeoResponse(
        seo_title=result["seo_title"],
        meta_description=result["meta_description"],
        analysis=result.get("analysis") or "",
        improvements=result.get("improvements") or [],
    )


# Common browser User-Agent so CDNs (Nike, Amazon, etc.) don't block the proxy
PROXY_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _proxy_url_allowed(url: str) -> bool:
    """SSRF check: only allow http(s) and block localhost/private IPs."""
    try:
        parsed = urlparse(url.strip())
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return False
        host = (parsed.hostname or "").lower()
        if host in ("localhost", "127.0.0.1") or host.startswith("192.168.") or host.startswith("10.") or host.startswith("169.254."):
            return False
        return True
    except Exception:
        return False


@router.get("/proxy-image")
async def proxy_image(url: str = ""):
    """
    Fetch an image from the given URL and return it. Used so the frontend can display
    product images that would otherwise be blocked by CORS (e.g. official brand CDNs).
    """
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="Missing url query parameter")
    if not _proxy_url_allowed(url):
        raise HTTPException(status_code=400, detail="URL not allowed")
    try:
        headers = {
            "User-Agent": PROXY_USER_AGENT,
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        }
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            r = await client.get(url.strip(), headers=headers)
            r.raise_for_status()
            ct = (r.headers.get("content-type") or "image/jpeg").split(";")[0].strip().lower()
            if "image/" not in ct and "octet-stream" not in ct:
                logger.warning("Proxy image: upstream returned non-image content-type %s for %s", ct, url[:60])
                raise HTTPException(status_code=502, detail="URL did not return an image")
            if "image/" not in ct:
                ct = "image/jpeg"
            return Response(content=r.content, media_type=ct)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Upstream image unavailable")
    except Exception as e:
        logger.warning("Proxy image failed for %s: %s", url[:80], e)
        raise HTTPException(status_code=502, detail="Could not fetch image")
