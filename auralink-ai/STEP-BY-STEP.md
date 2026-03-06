# Step-by-step: Get AuraLink running locally

Follow these steps in order. Use two terminals (one for backend, one for frontend).

---

## Step 1: Open a terminal and go to the backend

```bash
cd "/Users/pritesh/Documents/GitHub/AutoEntry Shopify/auralink-ai/backend"
```

---

## Step 2: Use the Python virtual environment

```bash
source .venv/bin/activate
```

You should see `(.venv)` in your prompt. If you don’t have a venv yet:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Step 3: Configure the backend for local dev

Edit the file `auralink-ai/backend/.env` (create it from `.env.example` if it doesn’t exist).

**For the scan flow to work from localhost, set CORS to allow the frontend:**

- Either **delete** the line `CORS_ORIGINS=...` (so it’s empty and the backend allows all origins),  
- Or set:  
  `CORS_ORIGINS=http://localhost:3000`

**Optional – real AI extraction:**  
Add one of these (get keys from Google AI Studio or OpenAI):

- `GEMINI_API_KEY=your_key_here`  
- or `OPENAI_API_KEY=your_key_here` and `VISION_PROVIDER=openai`

Without these, extraction may use a dummy/fallback.

Save the file.

---

## Step 4: Start the backend (leave this terminal open)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Wait until you see: **`Uvicorn running on http://0.0.0.0:8000`** and **`Application startup complete`**.

**Check:** Open **http://localhost:8000/health** in your browser. You should see something like:  
`{"status":"ok","service":"auralink-ai"}`.

If you see “Address already in use”:

```bash
lsof -i :8000
kill -9 <PID>
```

Then run the `uvicorn` command again.

---

## Step 5: Open a second terminal and go to the frontend

```bash
cd "/Users/pritesh/Documents/GitHub/AutoEntry Shopify/auralink-ai/frontend"
```

---

## Step 6: Install frontend dependencies (if you haven’t already)

```bash
npm install
```

---

## Step 7: Start the frontend (leave this terminal open)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Wait until you see: **`Local: http://localhost:3000`**.

---

## Step 8: Use the app

1. Open your browser at **http://localhost:3000** (use 3000, not 8000).
2. On the landing page, click **“Scan Your First Item”** (or go to **http://localhost:3000/landing.html?mode=scan**).
3. Allow camera access, or use **“Upload photo”** and choose an image.
4. After capture/upload, the app will call the backend at port 8000 to extract product data. You should see “Reading your product” then the extracted result.
5. From there you can continue the flow (e.g. flow-2 → flow-3 → choose marketplaces → connect Shopify → push live).

---

## Optional: Publishing API + Shopify (for “Push live”)

To complete the full flow (create listing and publish to Shopify), you need the **publishing API** on port 8001.

### A. Environment for publishing API

In `auralink-ai/publishing/` create a `.env` (or copy from `.env.example` if present) with at least:

- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (same Supabase project as backend, if you use it)
- `JWT_SECRET` (any long random string for dev)
- `FRONTEND_URL=http://localhost:3000`
- Shopify app credentials: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` (from Shopify Partner dashboard)

### B. Start the publishing API (third terminal)

```bash
cd "/Users/pritesh/Documents/GitHub/AutoEntry Shopify/auralink-ai/publishing"
npm install
node src/index.js
```

You should see: **`Publishing API listening on http://localhost:8001`**.

### C. Connect Shopify in the flow

When the static flow sends you to “Connect Shopify”, use your Shopify store domain (e.g. `mystore` or `mystore.myshopify.com`). The flow will use port 8001 for auth and publish.

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| “Couldn’t reach the server” on scan | Backend not running or CORS wrong. Do Step 4 and Step 3, then restart backend. |
| Backend “Address already in use” | Run `lsof -i :8000` and `kill -9 <PID>`, then start backend again. |
| Frontend shows “Not connected” | Backend must be running; open http://localhost:8000/health to confirm. |
| Scan works but “Push live” fails | Start the publishing API (Optional section) and ensure Shopify is connected in the flow. |

---

## Summary

| Step | Command / action |
|------|------------------|
| 1–2 | `cd auralink-ai/backend` → `source .venv/bin/activate` |
| 3 | Set `CORS_ORIGINS=` or `http://localhost:3000` in `backend/.env` |
| 4 | `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` → check http://localhost:8000/health |
| 5–6 | `cd auralink-ai/frontend` → `npm install` |
| 7 | `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev` |
| 8 | Open http://localhost:3000 → “Scan Your First Item” |
