# Cost per image (extraction → publish)

Use this to work out your pricing model. All figures are **approximate** and in **USD**; check [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) and [Cloud Vision pricing](https://cloud.google.com/vision/pricing) for current rates.

---

## What runs per scan (one image)

| Step | When it runs | API | Approx. cost per image (paid tier) |
|------|----------------|-----|------------------------------------|
| **1. Main extraction** | Every scan | Gemini (e.g. gemini-2.0-flash) | **~$0.001** |
| **2. Verification pass** | When OCR text exists | Gemini (text-only, 512 max output) | **~$0.0001** |
| **3. Synthetic OCR** | Only when no GCP Vision and no Tesseract | Gemini (1 image + short prompt) | **~$0.0005** |
| **4. Web enrichment** | When `ENABLE_WEB_ENRICHMENT=true` and `skip_web_enrichment=false` | Gemini (with or without Google Search grounding) | **~$0.035** (with Search, after free tier) or **~$0.001** (no Search / fallback) |
| **5. GCP Vision OCR** | When `GCP_VISION_CREDENTIALS_JSON` is set | Google Cloud Vision API | **~$0.0015** (after first 1,000 images/month free) |
| **6. Publish to Shopify** | When user clicks Publish | Shopify Admin API | **$0** (no per-call fee from Shopify) |

---

## Typical cost per image (your setup)

### Option A — Image-only extraction (no web enrichment)

- Main extraction: **~$0.001**
- Verification (if OCR): **~$0.0001**
- Optional synthetic OCR if no Vision/Tesseract: **~$0.0005**  
**Total: ~\$0.001–\$0.002 per image** (about **\$1–\$2 per 1,000 images**).

### Option B — With web enrichment (best accuracy)

- Option A plus web enrichment **with** Google Search grounding (after free tier): **+ ~\$0.035 per image**.  
**Total: ~\$0.036–\$0.037 per image** (~**\$36–\$37 per 1,000 images**).
- Free tier: 1,500 grounded requests per day free on Gemini 2.0 Flash paid tier, so cost applies after that.

### Option C — With GCP Vision OCR (no Search)

- Option A with GCP Vision instead of Tesseract/synthetic OCR: add **~\$0.0015** per image (after 1,000 free/month).  
**Total: ~\$0.0025–\$0.0035 per image** (~**\$2.50–\$3.50 per 1,000 images**).

---

## Gemini 2.0 Flash (reference)

- **Input:** $0.10 per 1M tokens (text/image/video).
- **Output:** $0.40 per 1M tokens.
- **Image:** Treated as tokens (~258–1,290 per image depending on size).
- **Grounding with Google Search:** 1,500 free requests/day, then **$35 per 1,000 grounded prompts**.

(Source: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing). Gemini 2.0 Flash is deprecated June 2026; newer models may have different rates.)

---

## Suggested pricing-model inputs

1. **Cost per scan**  
   Use **~$0.002** (image-only) or **~$0.037** (with web Search) as your upper/lower bounds per image.
2. **Mark-up**  
   Add your margin (e.g. 2–5×) and any fixed fees per listing.
3. **Free tier**  
   If you use Search grounding, 1,500 free scans/day can be offered as “free tier” before paid kicks in.
4. **Shopify**  
   No extra API cost for “publish”; price that as part of your product, not per-call.

---

## Summary table (per 1,000 images, USD)

| Mode | Per image | Per 1,000 images |
|------|-----------|-------------------|
| Image-only (no enrichment) | ~$0.001–$0.002 | ~$1–$2 |
| + GCP Vision OCR | + ~$0.0015 | + ~$1.50 |
| + Web enrichment (with Search, after free tier) | + ~$0.035 | + ~$35 |

Publishing to Shopify does **not** add per-image API cost.
