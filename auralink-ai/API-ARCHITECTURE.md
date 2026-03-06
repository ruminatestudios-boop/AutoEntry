# How the API connects: photo → accurate product data

This doc explains how all parts connect so the app can **pull accurate data from a photograph**: frontend → backend → OCR (optional) → Vision AI → response → draft/product.

---

## End-to-end flow (one picture)

```
[User]  →  Photo (camera or upload)
    ↓
[Frontend]  →  Convert image to base64
    ↓
[Frontend]  →  POST /api/v1/vision/extract  (body: image_base64, mime_type, include_ocr)
    ↓
[Backend]   →  Optional: Google Cloud Vision OCR on image bytes → text snippets
    ↓
[Backend]   →  Vision AI (Gemini or GPT-4o): image + OCR text → structured JSON
    ↓
[Backend]   →  Enrich material/brand from OCR if VLM didn’t set them
    ↓
[Backend]   →  Return VisionExtractionResponse (attributes, copy, tags)
    ↓
[Frontend]  →  Show “Scan result” or send to Review (flow-3) / Save as draft
    ↓
[Optional]  →  POST /api/v1/products/from-extraction → create product in DB
```

---

## 1. Frontend → API connection

### Where the frontend sends the photo

| Entry point | File | How it calls the API |
|------------|------|----------------------|
| **Landing scan** (camera/upload) | `frontend/public/landing.html` | Reads `window.AURALINK_CONFIG.API_URL` (or `<meta name="auralink-api-url">`), then `fetch(API_URL + '/api/v1/vision/extract', { method: 'POST', body: JSON.stringify({ image_base64, mime_type: 'image/jpeg', include_ocr: true }) })`. |
| **Dashboard upload** | `frontend/app/dashboard/upload/page.tsx` | Uses `apiFetch('/api/v1/vision/extract', …)` which uses `NEXT_PUBLIC_API_URL` from `frontend/lib/api.ts` (default `http://localhost:8000`). |
| **Static landing** | Same `landing.html` | Default API URL is `http://localhost:8000`; can be overridden by meta tag or build-time inject (`scripts/inject-api-url.js` with `NEXT_PUBLIC_API_URL`). |

### What the frontend sends

- **`image_base64`**: string, base64-encoded image (with or without `data:image/jpeg;base64,` prefix).
- **`mime_type`**: e.g. `image/jpeg` (or type of the uploaded file).
- **`include_ocr`**: `true` so the backend runs OCR and merges label text into attributes/copy for **more accurate** brand and material.

### Making sure the frontend hits the right backend

- **Local:** Backend on port **8000**, frontend on **3000**.  
  - Next.js: set `NEXT_PUBLIC_API_URL=http://localhost:8000` when running the frontend.  
  - Static `landing.html`: default is already `http://localhost:8000`; override with `<meta name="auralink-api-url" content="http://localhost:8000" />` or by setting `window.AURALINK_CONFIG.API_URL` before the scan runs.
- **Phone / other device:** Use your machine’s IP, e.g. `http://192.168.1.x:8000`, in `NEXT_PUBLIC_API_URL` or in the meta tag so the browser can reach the backend.

---

## 2. Backend API that pulls data from the photo

### Single endpoint that does the work

- **`POST /api/v1/vision/extract`**  
  - **Request body (JSON):** `VisionExtractionRequest`: `image_base64`, `mime_type`, `include_ocr` (default true).  
  - **Response:** `VisionExtractionResponse`: attributes (material, color, weight, dimensions, brand, exact_model, …), copy (seo_title, description, bullet_points, optional fact–feel–proof), tags (category, search_keywords), raw_ocr_snippets, confidence_score.

Defined in:

- **Route:** `backend/app/routes/vision.py` — `extract()`.
- **Schemas:** `backend/app/schemas/vision.py` — `VisionExtractionRequest`, `VisionExtractionResponse`, `ExtractionAttributes`, `ExtractionCopy`, `ExtractionTags`.

### What the backend does (step by step)

1. **Decode image**  
   Base64 (with or without data-URL prefix) → raw bytes.

2. **Optional OCR (for accuracy)**  
   If `include_ocr` is true, the backend calls **Google Cloud Vision** text detection (`app/services/ocr_service.py`: `run_ocr_google(image_bytes)`).  
   - Returns a list of text snippets (e.g. label lines).  
   - **Config:** In `backend/.env` set `GCP_VISION_CREDENTIALS_JSON` to the **contents** of your Google Cloud service-account JSON (or leave empty to skip OCR; extraction still runs with vision-only).

3. **Vision AI extraction**  
   `MultimodalProcessor` in `backend/app/services/vision_service.py`:  
   - Sends **image + OCR text** to either **Gemini 2.0 Flash** or **GPT-4o** (see config below).  
   - Uses a system prompt (UCP/schema.org-style) so the model returns structured JSON: attributes, copy, tags.  
   - **OCR is passed in the user prompt** so the model can use label text for brand, material, and exact wording → **more accurate** than image-only.

4. **Enrich from OCR**  
   After the VLM response, `vision.py` calls `enrich_attributes_from_ocr(ocr_snippets, current_material, current_brand)`.  
   - If the VLM didn’t set material/brand, the backend tries to infer them from OCR using known material phrases and optional brand DB (`ocr_service.py`).  
   - This again improves **accuracy** when labels are present.

5. **Quota (optional)**  
   If Supabase and Clerk are configured, the route checks free-scan usage and returns **402** when the user has used all free scans.

6. **Response**  
   Returns the full `VisionExtractionResponse` to the frontend.

---

## 3. Config that makes extraction work and accurate

### Minimum (vision only, no OCR)

In **`auralink-ai/backend/.env`**:

```env
VISION_PROVIDER=gemini
GEMINI_API_KEY=<your-real-gemini-api-key>
```

Or for OpenAI:

```env
VISION_PROVIDER=openai
OPENAI_API_KEY=<your-openai-api-key>
```

- **Gemini:** Get a key from [Google AI Studio](https://aistudio.google.com/apikey).  
- Without a valid key, the backend returns **503** “Vision API not configured.”

### For more accurate text (labels, brand, material): OCR

- In **`backend/.env`** set **`GCP_VISION_CREDENTIALS_JSON`** to the **full JSON string** of your Google Cloud Vision service account (or a path to a JSON file if your code reads it; current code expects the JSON string in env).  
- Enable the **Vision API** in Google Cloud for that project.  
- If this is not set, OCR is skipped but extraction still runs using only the image (less accurate for printed text).

### Optional

- **Supabase + Clerk:** For scan quota and “Save as draft” persistence (`POST /api/v1/products/from-extraction`).  
- **CORS:** Backend uses `CORS_ORIGINS` from env; empty or `*` allows all (typical for local dev).  
- **Brands DB:** `brands_db_path` in config for better brand matching from OCR.

---

## 4. Saving the result (draft / product)

- **Landing “Save as draft”**  
  After extraction, the frontend can call **`POST /api/v1/products/from-extraction`** with the **same** `VisionExtractionResponse` JSON as body (no image).  
  - **Route:** `backend/app/routes/products.py` — `create_product_from_extraction()`.  
  - Creates a Universal Product (UCP) and stores it (e.g. Supabase).  

- **Dashboard upload**  
  Same flow: `POST /api/v1/vision/extract` → show result → user can “Save” → `POST /api/v1/products/from-extraction` and optionally sync to Shopify.

So: **one photo** → **one extraction request** → **one optional product create request**. All parts are connected by these two endpoints and the shared response shape.

---

## 5. Quick checklist to “connect everything and pull data accurately”

| Step | What to do |
|------|------------|
| 1. Backend runs | `cd auralink-ai/backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| 2. Vision API key | In `backend/.env`: `GEMINI_API_KEY=<real-key>` (or `VISION_PROVIDER=openai` + `OPENAI_API_KEY`) |
| 3. (Optional) OCR for accuracy | In `backend/.env`: `GCP_VISION_CREDENTIALS_JSON=<paste full JSON>` and enable Vision API in GCP |
| 4. Frontend API URL | Next.js: `NEXT_PUBLIC_API_URL=http://localhost:8000`; static landing: default or meta tag / inject script |
| 5. Test | Open landing scan or dashboard upload → take/upload photo → you should see “Reading your product” then extracted title, attributes, tags. |

If extraction fails:

- **503** → Set a valid `GEMINI_API_KEY` (or OpenAI key if using OpenAI).  
- **404** → Backend not running or frontend using wrong URL; check port 8000 and `API_URL`.  
- **CORS** → Allow your frontend origin in `CORS_ORIGINS` or use `*` for dev.  
- **Inaccurate text** → Add `GCP_VISION_CREDENTIALS_JSON` and set `include_ocr: true` (default) so the backend runs OCR and passes it to the VLM.

---

## 6. File reference

| Purpose | File |
|--------|------|
| Frontend → backend URL | `frontend/lib/api.ts` (`API_BASE`), `frontend/public/landing.html` (`AURALINK_CONFIG.API_URL`), `frontend/scripts/inject-api-url.js` |
| Call extract from landing | `frontend/public/landing.html` (e.g. `runExtraction(base64)`, `fetch(apiUrl + '/api/v1/vision/extract', …)`) |
| Call extract from dashboard | `frontend/app/dashboard/upload/page.tsx` (`apiFetch("/api/v1/vision/extract", …)`) |
| Extract endpoint | `backend/app/routes/vision.py` (`POST /extract`) |
| Request/response shapes | `backend/app/schemas/vision.py` |
| Vision AI (Gemini / OpenAI) | `backend/app/services/vision_service.py` (`MultimodalProcessor`, `run_vision_extraction`, `extract_with_gemini`, `extract_with_openai`) |
| OCR and enrichment | `backend/app/services/ocr_service.py` (`run_ocr_google`, `enrich_attributes_from_ocr`) |
| Config (keys, provider) | `backend/app/config.py`, `backend/.env` |
| Create product from extraction | `backend/app/routes/products.py` (`POST /from-extraction`) |

---

See also:

- **CONNECT.md** – Start backend and frontend, verify connection.  
- **EXTRACTION-SETUP-CHECKLIST.md** – Photo extraction setup and quick test.
