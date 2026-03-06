# Is it working? What’s missing?

Quick status of the AuraLink photo → extraction → draft flow.

---

## What’s working

| Piece | Status |
|-------|--------|
| **Backend** | Routes are mounted: `/api/v1/vision/extract`, `/api/v1/products/from-extraction`, `/health`, etc. |
| **Vision extraction** | You have a Gemini API key set in `backend/.env`. So **photo → extract** (title, attributes, tags) can work: frontend sends base64 image to `POST /api/v1/vision/extract`, backend runs Gemini (and optional OCR) and returns JSON. |
| **Frontend → extract** | Landing scan and dashboard upload both call the correct API URL and `/api/v1/vision/extract` with `image_base64`, `mime_type`, `include_ocr: true`. |
| **Review flow (static)** | flow-3, flow-preview, etc. read from `sessionStorage` / draft; no backend required for viewing the review UI. |

So: **take/upload photo → “Reading your product” → extracted result on screen** can work if the backend is running and the browser can reach it (see CORS below).

---

## What’s missing or can break

### 1. CORS (local dev)

Your `backend/.env` has:

```env
CORS_ORIGINS=https://auralink.ai,https://www.auralink.ai
```

So the backend **only allows** those origins. When you run the app at **http://localhost:3000**, the browser sends `Origin: http://localhost:3000`, and the backend will **not** include that in `Access-Control-Allow-Origin`, so the browser blocks the response and you get network/CORS errors (e.g. “Couldn't reach the server” or failed fetch).

**Fix for local dev:** In `backend/.env` either:

- Set `CORS_ORIGINS=` (empty) or `CORS_ORIGINS=*` to allow all origins, or  
- Add your dev origin: `CORS_ORIGINS=http://localhost:3000,https://auralink.ai,https://www.auralink.ai`

Then restart the backend.

---

### 2. Save as draft (Supabase)

“Save as draft” calls **`POST /api/v1/products/from-extraction`**, which creates a row in **Supabase** (table `universal_products`). Your `.env` still has placeholders:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

So `get_supabase()` returns `None` and the backend returns **503** with “Database not configured” when you try to save a draft.

**So:**

- **Extraction:** Works (with real Gemini key + backend running + CORS fixed).
- **Save as draft:** Fails with 503 until you set real Supabase URL and service key and run the migrations (see repo `supabase/migrations/` and TROUBLESHOOTING.md).

If you only need “see extraction on screen” and don’t need to persist drafts in the DB yet, you can leave Supabase unset; the static flow (e.g. flow-3) can still show the result from sessionStorage.

---

### 3. Optional: OCR for better accuracy

For more accurate brand/material from labels, set in `backend/.env`:

```env
GCP_VISION_CREDENTIALS_JSON={"type":"service_account",...}
```

(Full Google Cloud Vision service account JSON as a single line or escaped string.) If not set, extraction still runs using only the image (Gemini/GPT-4o).

**Second OCR (Tesseract):** When Google Vision isn't configured or returns no text, the backend tries **Tesseract** locally. Install for your OS (e.g. `brew install tesseract` on Mac). Backend deps: `pytesseract`, `Pillow` (in `requirements.txt`). If Tesseract isn't installed, that step is skipped and the app falls back to synthetic OCR (Gemini describing visible text).

---

## Quick checklist

| Goal | What to do |
|------|------------|
| **Photo → extraction on screen** | 1) Backend running (`uvicorn` on port 8000). 2) `GEMINI_API_KEY` set (you have this). 3) **CORS:** set `CORS_ORIGINS=` or `CORS_ORIGINS=http://localhost:3000` in `backend/.env` and restart backend. 4) Frontend at http://localhost:3000 with `NEXT_PUBLIC_API_URL=http://localhost:8000`. |
| **Save as draft** | Set real `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `backend/.env`, run Supabase migrations, restart backend. |
| **Best accuracy from labels** | Set `GCP_VISION_CREDENTIALS_JSON` in `backend/.env` (optional). |

---

## TL;DR

- **Working:** Backend + Vision (Gemini) + frontend calls; extraction from a photo can work.
- **Missing for local dev:** CORS – set `CORS_ORIGINS=` or add `http://localhost:3000` so the browser allows requests from the frontend.
- **Missing for “Save as draft”:** Real Supabase URL and service key + migrations; until then you get 503 on from-extraction.

Fix CORS first, then try “Scan” or “Upload” again; if you still see errors, check the browser Network tab and backend logs.
