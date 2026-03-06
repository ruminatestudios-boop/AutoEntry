# Why isn’t it working? – Quick checks

Run these in order. They cover the usual reasons the scan/save flow fails.

---

## 1. Backend is up and reachable

**On your computer:**
```bash
curl http://localhost:8000/health
```
You should see: `{"status":"ok","service":"auralink-ai"}`

**From your phone (same Wi‑Fi):**  
Open in the browser: `http://YOUR_IP:8000/health`  
(e.g. `http://192.168.1.196:8000/health`)

- **No response / connection error**  
  - Backend not running → start it:  
    `cd auralink-ai/backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - From phone only: firewall blocking port 8000, or wrong IP. Allow port 8000 for your LAN or check the IP (e.g. `ipconfig getifaddr en0` on Mac).

---

## 2. API key is set (extraction)

Extraction uses **Gemini** or **OpenAI**. If the key is missing or wrong, you get 500 or “extraction failed”.

**Check backend `.env`:**
- For Gemini: `GEMINI_API_KEY=your_key` and `VISION_PROVIDER=gemini` (or unset).
- For OpenAI: `OPENAI_API_KEY=your_key` and `VISION_PROVIDER=openai`.

**Test extract from your computer:**
```bash
# Minimal test: small base64 image (1x1 red pixel)
curl -X POST http://localhost:8000/api/v1/vision/extract \
  -H "Content-Type: application/json" \
  -d '{"image_base64":"/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQACEQADAPgH/9k=","mime_type":"image/jpeg","include_ocr":false}'
```
- **200 + JSON** → extraction and API key are OK.
- **500** → check backend terminal for the traceback; usually missing/wrong `GEMINI_API_KEY` or `OPENAI_API_KEY`.

---

## 3. Database is set (Save as draft)

“Save as draft” calls `POST /api/v1/products/from-extraction` and inserts into **Supabase**. If Supabase isn’t configured, that request returns 503 or 500.

**Check backend `.env`:**
- `SUPABASE_URL=https://xxxx.supabase.co`
- `SUPABASE_SERVICE_KEY=your_service_role_key`

**Migrations:**  
In the Supabase SQL editor, run (in order):
- `20250224000000_universal_products.sql`
- `20250224100000_shopify_stores.sql`
- `20250225120000_agentic_engine.sql`
- `20250225180000_shopify_token_refresh.sql`

If any of these fail, fix the DB first.

---

## 4. Frontend is calling the backend (not 404)

If the app sends requests to the **wrong host** (e.g. port 3000 instead of 8000), you get **404** for `/api/v1/vision/extract` or `/api/v1/products/from-extraction`.

- **Desktop:** Use `http://localhost:3000`. Default `NEXT_PUBLIC_API_URL=http://localhost:8000` is fine.
- **Phone:** Open `http://YOUR_IP:3000` (e.g. `http://192.168.1.196:3000`). The landing page should **auto-use** `http://YOUR_IP:8000` as the API URL. If you still see 404, hard‑set it when starting the frontend:
  ```bash
  cd auralink-ai/frontend
  NEXT_PUBLIC_API_URL=http://192.168.1.196:8000 npm run dev
  ```
  (Use your real IP.)

---

## 5. What to look at when it fails

| Where it fails | What to check |
|----------------|----------------|
| **Upload photo → “Extracting…” never finishes or “Server error (404)”** | Backend not reachable or wrong API URL (see 1 and 4). From phone: try `http://YOUR_IP:8000/health` in the browser. |
| **“Extraction failed” / 500 after upload** | Backend logs (terminal). Usually missing or invalid `GEMINI_API_KEY` / `OPENAI_API_KEY` (see 2). |
| **“Save as draft” fails / 503 or 500** | Supabase not configured or migrations not run (see 3). Check backend logs. |
| **CORS error in browser console** | Backend CORS: with `cors_origins` empty in `.env`, backend allows all. If you set `CORS_ORIGINS`, add `http://YOUR_IP:3000` (and `http://localhost:3000`) for dev. |

---

## 6. One-line backend check

From the **backend** folder:

```bash
cd auralink-ai/backend
source .venv/bin/activate
python -c "
from app.config import get_settings
s = get_settings()
print('Supabase:', 'OK' if s.supabase_url and s.supabase_service_key else 'MISSING')
print('Gemini:', 'OK' if s.gemini_api_key else 'MISSING')
print('OpenAI:', 'OK' if s.openai_api_key else 'MISSING')
print('Vision provider:', s.vision_provider)
"
```

- If Supabase or both API keys show `MISSING`, fix `.env` and try again.

---

**TL;DR:**  
1) Backend running with `--host 0.0.0.0`, 2) `GEMINI_API_KEY` or `OPENAI_API_KEY` set, 3) `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` set and migrations run, 4) From phone use `http://YOUR_IP:3000` and ensure the app uses `http://YOUR_IP:8000` (auto or via `NEXT_PUBLIC_API_URL`). Check backend terminal for the exact error when something fails.
