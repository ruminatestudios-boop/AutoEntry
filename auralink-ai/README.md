# AuraLink AI

**Multimodal Product Onboarding Engine** — headless SaaS that turns a single product photo into a complete, structured listing and syncs to Shopify, Amazon, TikTok Shop, and Depop/eBay.

## Architecture

| Component | Tech | Purpose |
|-----------|------|---------|
| **Backend** | FastAPI (Python) | Vision API, product CRUD, workers |
| **Frontend** | Next.js 15 | Control Center dashboard |
| **AI** | Gemini 2.0 Flash / GPT-4o | Vision → attributes, copy, tags |
| **OCR** | Google Cloud Vision | Label text → material/brand enrichment |
| **DB** | PostgreSQL (Supabase) | Universal_Products + Channel_Adapters |
| **Queue** | Celery + Redis | Omnichannel sync jobs |
| **Auth** | Clerk | Cross-platform login |

## Repo layout

```
auralink-ai/
├── backend/          # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── routes/    # vision, products, audit
│   │   ├── schemas/
│   │   ├── services/  # vision, ocr, audit
│   │   └── tasks/     # Celery sync_to_shopify, sync_to_amazon, sync_to_depop
│   └── requirements.txt
├── frontend/          # Next.js 15 + Clerk
│   ├── app/
│   │   ├── dashboard/ # Control Center, upload, products
│   │   ├── sign-in/   # Clerk
│   │   └── sign-up/
│   └── package.json
├── supabase/
│   └── migrations/   # universal_products, channel_adapters
└── README.md
```

## Quick start

### 1. Backend (FastAPI)

```bash
cd auralink-ai/backend
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env       # set GEMINI_API_KEY, SUPABASE_*, etc.
uvicorn app.main:app --reload --port 8000
```

- **Vision**: Set `VISION_PROVIDER=gemini` and `GEMINI_API_KEY`, or `openai` and `OPENAI_API_KEY`.
- **OCR**: Optional. Set `GCP_VISION_CREDENTIALS_JSON` (JSON string or path) for label → material enrichment.
- **DB**: Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` after running migrations in Supabase.

### 2. Database (Supabase)

- Create a Supabase project and run the SQL migrations in order:
  - `supabase/migrations/20250224000000_universal_products.sql`
  - `supabase/migrations/20250224100000_shopify_stores.sql`

### 3. Frontend (Next.js 15)

```bash
cd auralink-ai/frontend
npm install
cp .env.local.example .env.local   # add Clerk keys, NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

- Open `http://localhost:3000`. You'll land on the marketing page (`/landing.html`) with **Try product scan** and **Control Center**.
- **Product scan**: `?mode=scan` opens the camera flow; capture → calls `POST /api/v1/vision/extract` on the backend.
- **API URL**: For production, set `<meta name="auralink-api-url" content="https://your-api.example.com" />` in `frontend/public/landing.html`, or ensure the backend is reachable from the client.

### 3b. Local flow testing (Shopify + Publishing API)

To test the **listings / Shopify** flow locally (enabled platforms, connect store, publish):

1. **Publishing API** (port 8001):
   ```bash
   cd auralink-ai/publishing
   npm install
   cp .env.example .env   # set SUPABASE_*, SHOPIFY_*, FRONTEND_URL=http://localhost:3000, etc.
   npm run dev
   ```
   API: http://localhost:8001 — `GET /health`, `GET /api/listings/enabled-platforms`.

2. **Frontend** (port 3000) — point at publishing API for listings:
   - In `frontend/.env.local` set:
     - `NEXT_PUBLIC_PUBLISHING_API_URL=http://localhost:8001`
     - `NEXT_PUBLIC_API_URL=http://localhost:8000` (if you run the main backend)
   - Run: `cd auralink-ai/frontend && npm run dev`.

3. Open **http://localhost:3000**. The review/listings UI will call `http://localhost:8001` for enabled platforms and publish; OAuth redirects use `FRONTEND_URL` (e.g. back to `http://localhost:3000/dashboard`).

### 4. Workers (Celery) — for Shopify sync

```bash
cd backend
celery -A app.tasks.sync_tasks worker -l info
```

`sync_to_shopify` is implemented; Amazon and Depop are stubbed.

### 5. Docker (optional)

```bash
cd auralink-ai
cp .env.example .env   # fill in values
docker-compose up -d
```

Backend runs at http://localhost:8000. Run Celery separately for sync.

## API (Backend)

- `POST /api/v1/vision/extract` — Image (base64) → `{ attributes, copy, tags }`. Target &lt;3s.
- `POST /api/v1/products` — Create master product.
- `POST /api/v1/products/from-extraction` — Save extraction as draft (photo → draft flow).
- `GET /api/v1/products` — List products.
- `GET /api/v1/products/{id}` — Get product + channel adapters.
- `POST /api/v1/products/{id}/sync/shopify` — Queue sync to Shopify.
- `GET /api/v1/shopify/install?shop=xxx` — Start Shopify OAuth.
- `GET /api/v1/shopify/callback` — OAuth callback (stores credentials).
- `GET /api/v1/shopify/stores` — List connected stores.
- `POST /api/v1/audit/count` — Audit mode: multi-item count (placeholder).

**Auth**: When `CLERK_SECRET_KEY` is set, protected routes require `Authorization: Bearer <token>`. See `.env.example`.

## Success metrics (from brief)

- **Extraction accuracy**: Aim &gt;95% on material/color (OCR + VLM + brand DB).
- **Processing time**: &lt;3s from photo upload to draft listing.
- **Sync reliability**: Implement idempotent workers and retries for zero-latency inventory across 3+ platforms.

## Mobile (React Native / Expo)

The brief specifies **Capture Mode** with high-res camera access. Add a separate `mobile/` app (Expo) that captures photos and calls `POST /api/v1/vision/extract` with the same payload; reuse Clerk for auth.

## License

Proprietary / as per your repo.
