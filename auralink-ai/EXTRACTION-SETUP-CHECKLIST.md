# Photo extraction – setup checklist

Use this to confirm all pieces are in place for **take picture → extract → review → preview** to work.

---

## 1. Backend

| Check | Status | Notes |
|-------|--------|--------|
| Backend runs | ⬜ | From `auralink-ai/backend`: `uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| Vision route mounted | ✅ | `main.py` includes `vision.router` at `/api/v1/vision` → `POST /api/v1/vision/extract` |
| **Vision API key set** | ⚠️ **Action needed** | In `backend/.env`: replace `GEMINI_API_KEY=your_gemini_api_key` with a **real** Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Until this is set, extraction returns **503** "Vision API not configured." |
| Vision provider | ✅ | `VISION_PROVIDER=gemini` in `.env` (or `openai` + `OPENAI_API_KEY` if using OpenAI) |

**Backend .env (minimum for extraction):**
```env
VISION_PROVIDER=gemini
GEMINI_API_KEY=<your-real-gemini-api-key>
```
Optional: `SUPABASE_*` for scan quota; `CORS_ORIGINS` empty or `*` for local dev.

---

## 2. Frontend

| Check | Status | Notes |
|-------|--------|--------|
| API URL | ✅ | `landing.html` uses `window.AURALINK_CONFIG.API_URL` (default `http://localhost:8000`). |
| inject-api-url | ✅ | `npm run dev` runs `inject-api-url.js`; use `NEXT_PUBLIC_API_URL` for non-local (e.g. phone: `http://YOUR_IP:8000`). |
| Extraction call | ✅ | Landing scan flow calls `POST {API_URL}/api/v1/vision/extract` with `image_base64`, `mime_type`, `include_ocr: true`. |
| Draft → flow-3 | ✅ | On success, `auralink_draft_listing` is set and redirect to `flow-3.html`. |
| flow-3 → draft | ✅ | flow-3 saves `title`, `price`, `description`, `category`, `condition`, `tags`, `extraction` to `auralink_review_draft`. |
| flow-preview | ✅ | Reads draft and falls back to `draft.extraction` for description, category, condition, tags. |

---

## 3. Quick test

1. **Backend:** In `auralink-ai/backend`, ensure `.env` has a real `GEMINI_API_KEY`, then:
   ```bash
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
2. **Frontend:** In `auralink-ai/frontend`:
   ```bash
   npm run dev
   ```
3. **Browser:** Open `http://localhost:3000/landing.html?mode=scan` (or the port Next shows).
4. Allow camera, point at a product, capture. You should see "Reading your product" then redirect to **Review your listing** (flow-3) with extracted title, price, category, tags.

**If extraction fails:**
- **503** → Set a real `GEMINI_API_KEY` (or `OPENAI_API_KEY` if using OpenAI) in `backend/.env`.
- **404** → Backend not running or frontend calling wrong URL; check backend port and `API_URL`.
- **CORS** → Backend `CORS_ORIGINS` empty or `*` for localhost.

---

## Summary

| Piece | Required | Your status |
|-------|----------|-------------|
| Backend running on port 8000 | Yes | Start with uvicorn |
| `GEMINI_API_KEY` (or `OPENAI_API_KEY`) set to a **real** key in `backend/.env` | Yes | ⚠️ Replace `your_gemini_api_key` |
| Frontend dev server + landing `?mode=scan` | Yes | `npm run dev` |
| API URL = backend URL | Yes | Default `http://localhost:8000` is correct for local |

Once `GEMINI_API_KEY` in `backend/.env` is a real key, photo extraction should work end-to-end.
