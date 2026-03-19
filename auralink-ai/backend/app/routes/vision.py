"""
Vision extraction: MultimodalProcessor → UCP/schema.org attributes, Fact-Feel-Proof copy.
"""
import asyncio
import base64
import logging
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import ValidationError
import httpx

from app.auth import optional_verify_clerk
from app.db import get_supabase, get_scan_usage, increment_scan
from app.schemas.vision import VisionExtractionRequest, VisionExtractionResponse, FetchProductImagesRequest, OptimizeSeoRequest, OptimizeSeoResponse
from app.services.vision_service import (
    MultimodalProcessor,
    get_synthetic_ocr,
    get_dummy_extraction,
    apply_post_extraction,
    apply_blocklist_and_ocr_validation,
    apply_normalizer,
    apply_verification_pass,
    run_invoice_extraction,
    VisionServiceError,
)
from app.services.ocr_service import (
    run_ocr_google,
    run_ocr_tesseract,
    enrich_attributes_from_ocr,
    extract_dimensions_from_ocr,
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
    Extract from one image. Supports extraction_type: product (listing), invoice, or receipt.
    Product: returns attributes, extraction_copy, tags (UCP + schema.org/Product).
    Invoice/Receipt: returns vendor_name, document_date, line_items, total, currency, etc.
    """
    from app.config import get_settings
    settings = get_settings()
    raw_b64 = request.image_base64
    mime = request.mime_type or "image/jpeg"
    extraction_type = (request.extraction_type or "product").strip().lower()

    # Invoice / receipt path
    if extraction_type in ("invoice", "receipt"):
        raw_b64 = _resize_image_if_large(raw_b64, mime)
        ocr_snippets = []
        raw_bytes = b""
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
                if not ocr_snippets:
                    ocr_snippets = await asyncio.to_thread(run_ocr_tesseract, raw_bytes)
                if not ocr_snippets:
                    ocr_snippets = await get_synthetic_ocr(raw_b64, mime)
        # Be defensive: downstream helpers expect a list.
        ocr_snippets = ocr_snippets or []
        use_dummy = bool(getattr(settings, "force_dummy_vision", False))
        if use_dummy:
            from app.schemas.vision import InvoiceExtractionResponse, InvoiceLineItem
            dummy = InvoiceExtractionResponse(
                extraction_type=extraction_type,
                vendor_name="Demo Vendor",
                document_date="2025-01-15",
                invoice_number="INV-001",
                line_items=[
                    InvoiceLineItem(description="Sample item", quantity=1, unit_price=29.99, amount=29.99),
                ],
                subtotal=29.99,
                tax=0,
                total=29.99,
                currency="GBP",
                confidence_score=0.5,
            )
            return dummy.model_dump()
        if settings.vision_provider == "gemini" and not bool(settings.gemini_api_key):
            raise HTTPException(
                status_code=503,
                detail="Vision API not configured. Set GEMINI_API_KEY in backend .env to use invoice extraction.",
            )
        if settings.vision_provider == "openai" and not bool(settings.openai_api_key):
            raise HTTPException(
                status_code=503,
                detail="Vision API not configured. Set OPENAI_API_KEY in backend .env to use invoice extraction.",
            )
        supabase = get_supabase()
        user_id = _auth.get("sub") if _auth else None
        if user_id and supabase:
            usage = get_scan_usage(supabase, user_id)
            if not usage.get("can_scan", True):
                raise HTTPException(status_code=402, detail="Scan limit reached. Upgrade to continue.")
        try:
            result = await asyncio.wait_for(
                run_invoice_extraction(raw_b64, mime, ocr_snippets, extraction_type),
                timeout=120.0,
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail="Invoice extraction timed out. Try a clearer or smaller image, then retry.",
            ) from None
        except Exception as e:
            logger.warning("Invoice extraction failed: %s", e)
            raise HTTPException(
                status_code=503,
                detail=f"Invoice extraction failed: {e}",
            ) from None
        if user_id and supabase:
            increment_scan(supabase, user_id)
        return result.model_dump()

    # Product path (existing)
    has_gemini = bool(settings.gemini_api_key)
    has_openai = bool(settings.openai_api_key)
    use_dummy = bool(getattr(settings, "force_dummy_vision", False))
    if use_dummy:
        return get_dummy_extraction().model_dump()
    if settings.vision_provider == "gemini" and not has_gemini:
        raise HTTPException(
            status_code=503,
            detail="Vision API not configured. Set GEMINI_API_KEY in backend .env to use image extraction.",
        )
    if settings.vision_provider == "openai" and not has_openai:
        raise HTTPException(
            status_code=503,
            detail="Vision API not configured. Set OPENAI_API_KEY in backend .env.",
        )

    supabase = get_supabase()
    user_id = _auth.get("sub") if _auth else None
    if user_id and supabase:
        usage = get_scan_usage(supabase, user_id)
        if not usage.get("can_scan", True):
            raise HTTPException(status_code=402, detail="Scan limit reached. Upgrade to continue.")

    raw_b64 = request.image_base64
    mime = request.mime_type or "image/jpeg"
    ocr_snippets: list[str] = []
    raw_bytes: bytes = b""

    # Resize early so OCR and vision both run on smaller image (faster, especially on mobile)
    raw_b64 = _resize_image_if_large(raw_b64, mime)

    if request.include_ocr:
        async def _run_ocr_with_timeout() -> list[str]:
            out: list[str] = []
            try:
                raw_bytes = _decode_base64(raw_b64)
            except Exception:
                return out
            if not raw_bytes:
                return out
            try:
                out = await asyncio.wait_for(
                    run_ocr_google(raw_bytes),
                    timeout=25.0,
                )
            except asyncio.TimeoutError:
                logger.warning("Google OCR timed out after 25s")
            except Exception as e:
                logger.warning("Google OCR failed: %s", e)
            if not out and raw_bytes:
                try:
                    out = await asyncio.wait_for(
                        asyncio.to_thread(run_ocr_tesseract, raw_bytes),
                        timeout=20.0,
                    )
                except asyncio.TimeoutError:
                    logger.warning("Tesseract OCR timed out after 20s")
                except Exception as e:
                    logger.warning("Tesseract OCR failed: %s", e)
            if not out:
                try:
                    out = await asyncio.wait_for(
                        get_synthetic_ocr(raw_b64, mime),
                        timeout=15.0,
                    )
                except asyncio.TimeoutError:
                    logger.warning("Synthetic OCR timed out after 15s")
                except Exception as e:
                    logger.warning("Synthetic OCR failed: %s", e)
            return out or []

        try:
            ocr_snippets = await asyncio.wait_for(_run_ocr_with_timeout(), timeout=45.0)
        except asyncio.TimeoutError:
            logger.warning("OCR step timed out, continuing with empty snippets")
            ocr_snippets = []
    # Be defensive: downstream helpers expect a list.
    ocr_snippets = ocr_snippets or []

    # Already resized above for both OCR and vision. Main Gemini call has 120s timeout inside processor.
    try:
        result = await _processor.process(
            image_base64=raw_b64,
            mime_type=mime,
            ocr_snippets=ocr_snippets or None,
        )
    except asyncio.TimeoutError:
        logger.warning("Vision extraction timed out (Gemini >120s)")
        raise HTTPException(
            status_code=504,
            detail="Extraction took too long. Try a smaller or simpler image, or try again in a moment.",
        ) from None
    except ValidationError as e:
        logger.warning("Vision extraction validation error: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Vision extraction returned invalid structured data. Please retry with a clearer image.",
        ) from None
    except VisionServiceError as e:
        logger.warning("Vision extraction upstream error: %s", e)
        raise HTTPException(status_code=503, detail=str(e)) from None
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
        lower_err = err_msg.lower()
        is_key_error = (
            "api_key_invalid" in lower_err
            or "api key not valid" in lower_err
            or ("403" in err_msg and "invalid argument" not in lower_err)
            or ("permission denied" in lower_err and "api key" in lower_err)
        )
        if is_key_error:
            raise HTTPException(
                status_code=503,
                detail="Gemini API key invalid or restricted. Check GEMINI_API_KEY in backend .env and ensure the Generative Language API is enabled in Google Cloud / AI Studio.",
            )
        if "429" in err_msg or "quota" in err_msg.lower() or "resource exhausted" in err_msg.lower():
            raise HTTPException(status_code=503, detail="Gemini quota exceeded. Try again later or check your Google Cloud quota.")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {err_msg}")

    # Enrich material/brand from OCR (material phrases, brands_db) if not already set
    mat, brand = enrich_attributes_from_ocr(
        ocr_snippets,
        current_material=result.attributes.material,
        current_brand=result.attributes.brand,
    )
    if mat and not result.attributes.material:
        result.attributes.material = mat
    if brand and not result.attributes.brand:
        result.attributes.brand = brand

    # Blocklist generic output + OCR-first overwrite when VLM disagrees or is generic
    result = apply_blocklist_and_ocr_validation(result, ocr_snippets)
    result = apply_normalizer(result)

    # Optional verification pass: text-only consistency check (Gemini). Cap at 30s so total route stays within frontend timeout.
    if ocr_snippets and settings.gemini_api_key:
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(apply_verification_pass, result, ocr_snippets, settings.gemini_api_key),
                timeout=30.0,
            )
        except asyncio.TimeoutError:
            logger.debug("Verification pass timed out, using draft as-is")
        except Exception as e:
            logger.debug("Verification pass skipped: %s", e)

    # Dimensions from OCR when VLM did not extract
    if not result.attributes.dimensions and ocr_snippets:
        dims = extract_dimensions_from_ocr(ocr_snippets)
        if dims:
            result.attributes.dimensions = dims
            if result.sources is None:
                result.sources = {}
            result.sources["dimensions"] = "ocr"

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
        increment_scan(supabase, user_id)

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
