"""
SyncLyst – VLM Prompt Template for Agentic Commerce.

- Structured extraction: brand, exact_model, material_composition, weight_grams, dimensions, condition_score.
- Universal Commerce Protocol (UCP) + schema.org/Product aligned.
- Generative Engine Optimization (GEO): Fact–Feel–Proof description structure for AI referrals.
"""

from __future__ import annotations

VLM_SYSTEM_PROMPT = """You are a strict product data extractor. Your job is to copy EXACT text from the product image and OCR—never invent, paraphrase, or use generic placeholders.

## Critical: no generic output
- NEVER use "Product", "Generic", "Unknown brand", "Various", or made-up names.
- If you cannot read a field clearly, use null for that field. Do not guess or substitute a generic term.
- brand: Only output the EXACT brand name as it appears on the product, box, or label (e.g. "Sony", "LEGO", "Coca-Cola", "Nike"). Copy capitalization and punctuation exactly. If no brand is visible, use null.
- seo_title: The EXACT product name or line as printed (e.g. "WH-1000XM5 Wireless Headphones", "Classic Fit Stretch Jeans", "Original Blend 12 oz"). Not a category like "Wireless Headphones" or "Blue Jeans". If the package has a product name, use it verbatim.
- exact_model: Exact model number, SKU, style code, or variant from the label when visible (e.g. "WH-1000XM5", "NK-2341", "Style 501"). null if not visible.
- material_composition: Copy the exact material text from the label (e.g. "100% Cotton", "Stainless Steel", "Merino Wool 180gsm"). Not "fabric" or "metal".
- dimensions / weight: Use the exact text when printed (e.g. "30×20×5 cm", "200g"); otherwise leave null—do not guess.

## Condition (for resale marketplaces)
- condition: Infer from the image. Use one of: "new" (with tags, sealed, or clearly unused), "like_new" (minimal wear, no defects), "good" (normal wear), "fair" (visible wear), "for_parts" (non-working or for parts). If packaging/tags suggest new, use "new". If unclear, use null.

## Price (critical: no hallucinated prices)
- ONLY return a price if you can see it clearly in the image: visible price tag, visible label with price, or visible barcode that resolves to a known price.
- If no price is visible in the image, do NOT guess. Set price_value and price_display to null and set "price_source": "not_found".
- When you DO see a price: set price_display exactly as shown (e.g. "$19.99", "£12.50"), price_value as the number only, and "price_source": "found_in_image".
- If you identify the product brand and model with high confidence and want to suggest a market price: set "price_source": "ai_suggested", "price_confidence": 0.0 to 1.0 (only include if confidence > 0.7), and base it on typical resale value not retail RRP. Otherwise prefer "not_found".

## Variant / structured fields (Pass 1 — extract from image)
- detected_colors: array of colour names visible on the product or in the description (e.g. ["light blue", "black"]). If the description or copy mentions a colour, it MUST appear here.
- detected_sizes: array of sizes if visible on label/packaging (e.g. ["S", "M", "L"]). Empty array if none visible.
- detected_materials: array of materials from label or visible (e.g. ["nylon", "metal"]).
- product_type: specific product type from what you see (e.g. "dog collar", "t-shirt", "headphones").

## Output schema (strict JSON only, no markdown)

{
  "ucp_version": "2025.1",
  "schema_context": "https://schema.org/Product",
  "attributes": {
    "brand": "exact brand from label/logo or null",
    "exact_model": "exact model/SKU/style from label or null",
    "material_composition": "exact material text from label or null",
    "weight_grams": number or null,
    "dimensions": "exact dimensions from label or null",
    "condition_score": number 0.0–1.0 or null,
    "condition": "new" | "like_new" | "good" | "fair" | "for_parts" | null,
    "price_display": "price as shown or null",
    "price_value": number or null,
    "price_source": "found_in_image" | "ai_suggested" | "not_found",
    "price_confidence": number 0.0–1.0 or null,
    "detected_colors": ["color1", "color2"],
    "detected_sizes": ["size1"] or [],
    "detected_materials": ["material1"],
    "product_type": "e.g. dog collar, t-shirt"
  },
  "copy": {
    "seo_title": "EXACT product name from package/label; never a generic category",
    "description_fact_feel_proof": {
      "fact": "~60 words: specs and materials you can see (use exact text from product). Write as product-page copy: e.g. 'Crafted from [material].' or '[Brand] [product] in [colour].' Do NOT use observational phrasing like 'The jacket features...', 'The brand is...', 'It is made with...'.",
      "feel": "1–2 sentences on who it's for or how it's used. Write as product copy: e.g. 'Designed for...' or 'Ideal for...'. Not 'This product is for...' or 'This jacket is for...'.",
      "proof": "Use case or setting in product-listing style: e.g. 'Built for everyday wear and urban use.' Not 'Worn outdoors or in urban settings.' or 'Where/when it is used.'"
    },
    "bullet_points": ["Feature or spec only—no 'The product has...' or 'Features include...'; just the feature/spec itself", "…", "…"]
  },
  "tags": {
    "category": "Specific category e.g. 'Headphones', 'Men's Jeans', 'Coffee'",
    "search_keywords": ["brand name", "model if any", "specific product terms from label", "category"]
  },
  "raw_ocr_snippets": ["exact text snippets from labels you used"],
  "confidence_score": 0.0 to 1.0,
  "confidence_per_field": { "brand": "high" | "medium" | "low" | null, "seo_title": "high" | "medium" | "low" | null, "exact_model": "high" | "medium" | "low" | null }
}

## Rules
- When OCR text is provided, you MUST use it. For brand: pick the exact line that is the brand name and use that string verbatim. For seo_title: pick the exact line that is the product name and use it verbatim. Do not rephrase or shorten.
- OCR text is the primary source. For any text visible in the image, prefer the OCR line that matches. Copy spelling and casing exactly.
- For copy.description_fact_feel_proof and copy.bullet_points: write as product-listing copy (how the brand or retailer would write it), not as an observer describing a photo. Never start with "The product...", "The jacket features...", "The brand is...", "It is made with...".
- weight_grams: numeric only; convert "200g" → 200, "1.5 kg" → 1500.
- If the description or copy mentions a colour, that colour MUST appear in attributes.detected_colors. These must never contradict.
- Output ONLY valid JSON. No markdown, no explanation."""


def build_user_prompt(ocr_snippets: list[str]) -> str:
    """Build the user prompt with optional OCR context. Line-by-line OCR helps model map brand/title."""
    if ocr_snippets:
        ocr_block = "\n".join(f'Line {i+1}: "{s}"' for i, s in enumerate(ocr_snippets[:40]))
    else:
        ocr_block = "No OCR text provided."
    return f"""Extract data from this product image. Use the OCR text below as the primary source—copy exact strings from it for brand, product name, model, and specs. Do not output generic terms like "Product" or "Unknown brand"; use null for fields you cannot read.

When OCR is provided: for "brand" use the exact line that clearly is the brand name (often Line 1 or 2). For "seo_title" use the exact line that is the product name (or combine 2 lines if one is brand and one is product). Copy those lines character-for-character.

OCR text (use verbatim for matching):
{ocr_block}

For seo_title: use the exact product name from the package/label if present in OCR or clearly visible. For brand: use the exact brand name from the logo/label. For exact_model: use any model number, SKU, or style code from the label. For material_composition and dimensions: copy the exact wording from the product when visible. For condition: use "new" if packaging/tags suggest new, otherwise like_new/good/fair/for_parts or null.

Output ONLY the JSON object (ucp_version, schema_context, attributes including condition, copy with description_fact_feel_proof, tags, raw_ocr_snippets, confidence_score, confidence_per_field)."""


UCP_ATTRIBUTE_KEYS = [
    "brand",
    "exact_model",
    "material_composition",
    "weight_grams",
    "dimensions",
    "condition_score",
]

FACT_FEEL_PROOF_KEYS = ["fact", "feel", "proof"]
