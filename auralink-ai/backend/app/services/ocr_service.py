"""
OCR and attribute enrichment: extract label text, map to Material; optional brand DB lookup.
"""
import io
import json
import os
import re
from pathlib import Path
from typing import Optional, Tuple

from app.config import get_settings
from app.services.product_title_heuristics import is_material_trademark_ocr_line


# Known phrases that imply material (label text → material attribute)
MATERIAL_PHRASES = [
    "100% cotton",
    "100% organic cotton",
    "organic cotton",
    "cotton",
    "polyester",
    "polyamide",
    "nylon",
    "wool",
    "leather",
    "synthetic",
    "metal",
    "stainless steel",
    "plastic",
    "ceramic",
    "glass",
    "wood",
    "bamboo",
    "recycled",
    "vegan leather",
    "silk",
    "linen",
    "hemp",
    "rubber",
    "aluminum",
    "brass",
    "copper",
    "merino",
    "merino wool",
    "gore-tex",
    "gore tex",
    "recycled polyester",
    "tri-blend",
    "triblend",
    "polycotton",
    "acrylic",
    "velvet",
    "suede",
    "cork",
    "zinc",
    "carbon",
    "fibre",
    "fiber",
]


def infer_material_from_text(text: str) -> Optional[str]:
    """If OCR/label text contains a known material phrase, return it (normalized)."""
    if not text or not text.strip():
        return None
    lower = text.lower().strip()
    for phrase in MATERIAL_PHRASES:
        if phrase in lower:
            return phrase.title()
    return None


def load_brands_db() -> dict[str, str]:
    """Load known brand names (and optional logo keywords) for cross-reference. Returns dict of normalized_name -> display_name."""
    settings = get_settings()
    path = (settings.brands_db_path or "").strip()
    if not path or not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
        if isinstance(data, list):
            return {str(b).lower(): str(b) for b in data}
    except Exception:
        pass
    return {}


def match_brand_from_text(text: str, brands_db: Optional[dict[str, str]] = None) -> Optional[str]:
    """If OCR/text contains a known brand from brands_db, return display name."""
    if not text or not text.strip():
        return None
    db = brands_db if brands_db is not None else load_brands_db()
    if not db:
        return None
    lower = text.lower()
    for key, display in db.items():
        if key in lower:
            return display
    return None


GENERIC_BRANDS = {"product", "generic", "unknown", "unknown brand", "various", "n/a", "none", ""}
GENERIC_TITLES = {"product", "generic product", "unknown product", "item", "product name", ""}

# Short phrases that appear on labels but are NOT the brand name (exclude from brand candidate)
NOT_BRAND_PHRASES = {
    "care instructions", "ingredients", "nutrition facts", "nutrition information",
    "size", "sizes", "made in", "product of", "wash", "dry clean", "do not bleach",
    "warning", "net weight", "net wt", "best before", "exp", "use by",
    "keep refrigerated", "store in", "recyclable", "recycle", "all rights reserved",
    "copyright", "trademark", "tm", "r", "ce", "certified", "organic", "vegan",
    "gluten free", "suitable for", "contents", "volume", "ml", "fl oz", "oz",
    "each", "piece", "pieces", "pack", "pack of", "count", "style", "color", "colour",
    "model", "sku", "upc", "barcode", "code", "no", "yes", "new", "sale",
    "premium quality", "high quality", "best quality", "imported", "distributed by",
}


def _looks_like_price(s: str) -> bool:
    if not s or len(s) > 20:
        return False
    cleaned = s.replace("$", "").replace("£", "").replace("€", "").replace(".", "").replace(",", "").strip()
    return cleaned.isdigit()


def _looks_like_brand(s: str) -> bool:
    if not s or len(s) < 2 or len(s) > 50:
        return False
    if _looks_like_price(s):
        return False
    words = s.split()
    return 1 <= len(words) <= 5


def _looks_like_product_title(s: str) -> bool:
    if not s or len(s) < 4 or len(s) > 200:
        return False
    if _looks_like_price(s):
        return False
    lower = s.lower()
    if any(x in lower for x in ("terms and conditions", "all rights reserved", "ingredients:", "nutrition")):
        return False
    return True


def best_brand_and_title_from_ocr(ocr_snippets: Optional[list[str]]) -> Tuple[Optional[str], Optional[str]]:
    """Pick best OCR line for brand and for product title. Brand is usually in the first few lines."""
    if not ocr_snippets:
        return None, None
    brand_candidate: Optional[str] = None
    title_candidate: Optional[str] = None

    def _is_brand_line(line: str) -> bool:
        if not line or line.lower() in GENERIC_BRANDS:
            return False
        if line.lower() in NOT_BRAND_PHRASES:
            return False
        # Exclude lines that are clearly instructions or specs
        lower = line.lower()
        if any(lower.startswith(p) for p in ("care", "wash", "dry", "ingredients", "nutrition", "size:", "net ")):
            return False
        return _looks_like_brand(line)

    # Brand: prefer first line that looks like a brand (top of pack = brand often)
    for line in ocr_snippets[:15]:
        line = line.strip()
        if not line:
            continue
        if _is_brand_line(line):
            brand_candidate = line
            break

    # Title: longest line that looks like a product name — never use the brand line alone as title
    title_lines: list[str] = []
    for line in ocr_snippets:
        line = line.strip()
        if not line:
            continue
        if not _looks_like_product_title(line):
            continue
        if is_material_trademark_ocr_line(line):
            continue
        title_lines.append(line)
    title_lines.sort(key=len, reverse=True)
    brand_l = (brand_candidate or "").strip().lower()
    for cand in title_lines:
        if brand_l and cand.strip().lower() == brand_l:
            continue
        title_candidate = cand
        break

    return brand_candidate, title_candidate


async def run_ocr_google(image_bytes: bytes) -> list[str]:
    """
    Run Google Cloud Vision text detection on image bytes.
    Returns list of text snippets (e.g. full text split by lines or blocks).
    """
    settings = get_settings()
    creds_json = (settings.gcp_vision_credentials_json or "").strip()
    if not creds_json:
        return []

    try:
        from google.cloud import vision
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            f.write(creds_json.encode("utf-8"))
            f.flush()
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = f.name
        try:
            client = vision.ImageAnnotatorClient()
            image = vision.Image(content=image_bytes)
            resp = client.text_detection(image=image)
            texts = resp.text_annotations
            if not texts:
                return []
            # First annotation is full text; rest are per-word. Use full text and split by line.
            full = texts[0].description or ""
            snippets = [s.strip() for s in full.splitlines() if s.strip()]
            return snippets[:50]
        finally:
            try:
                os.unlink(f.name)
            except Exception:
                pass
    except Exception:
        return []


def run_ocr_tesseract(image_bytes: bytes) -> list[str]:
    """Run Tesseract OCR locally. Returns text lines or [] if tesseract not available."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return []
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        text = pytesseract.image_to_string(img)
        lines = [s.strip() for s in text.splitlines() if s.strip()]
        return lines[:80]
    except Exception:
        return []


def enrich_attributes_from_ocr(
    ocr_snippets: Optional[list[str]],
    current_material: Optional[str] = None,
    current_brand: Optional[str] = None,
) -> tuple[Optional[str], Optional[str]]:
    """
    From OCR snippets, infer material and brand if not already set.
    Returns (material, brand).
    """
    material = current_material
    brand = current_brand
    if not ocr_snippets:
        return material, brand
    combined = " ".join(ocr_snippets).lower()
    if not material:
        material = infer_material_from_text(combined)
    if not brand:
        brand = match_brand_from_text(combined)
    return material, brand


# Regex for dimensions in OCR: e.g. "30x20x5 cm", "10 × 20 × 5 cm", "30*20*5cm"
DIMENSION_PATTERNS = [
    re.compile(r"(\d+(?:[.,]\d+)?)\s*[x×X*]\s*(\d+(?:[.,]\d+)?)\s*[x×X*]\s*(\d+(?:[.,]\d+)?)\s*(cm|in|inch|mm)\b", re.I),
    re.compile(r"(\d+(?:[.,]\d+)?)\s*[x×X*]\s*(\d+(?:[.,]\d+)?)\s*(cm|in|inch|mm)\b", re.I),
]


def extract_dimensions_from_ocr(ocr_snippets: Optional[list[str]]) -> Optional[str]:
    """Extract dimensions string from OCR (e.g. '30×20×5 cm'). Returns None if not found."""
    if not ocr_snippets:
        return None
    combined = " ".join(ocr_snippets)
    for pat in DIMENSION_PATTERNS:
        m = pat.search(combined)
        if m:
            groups = m.groups()
            if len(groups) == 4:
                return f"{groups[0]}×{groups[1]}×{groups[2]} {groups[3]}"
            if len(groups) == 3:
                return f"{groups[0]}×{groups[1]} {groups[2]}"
    return None
