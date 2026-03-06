# AuraLink AI – Project Brief Mapping

This document maps the Gemini-provided brief to the implemented codebase.

## 1. Executive Summary ✓

- **Goal**: Headless SaaS that uses VLMs to convert one product photo into a structured data profile. **Implemented**: FastAPI vision API + Next.js Control Center; single image → attributes, copy, tags.
- **Channels**: Shopify, Amazon (SP-API), TikTok Shop, Depop/eBay. **Implemented**: DB schema with `channel_adapters`; Celery tasks stubbed for Shopify, Amazon, Depop (ready for GraphQL/SP-API/Depop API).

## 2. Technical Architecture ✓

- **Backend**: FastAPI (Python), API-first. **Location**: `backend/app/`.
- **Frontend**: Next.js 15 (TypeScript). **Location**: `frontend/app/`.
- **Vision API**: Receives image, returns JSON with `attributes` (material, color, weight, dimensions, brand), `copy` (SEO title, description, bullets), `tags` (category, search keywords). **Location**: `backend/app/routes/vision.py`, `backend/app/services/vision_service.py` (Gemini 2.0 Flash or GPT-4o).
- **Database**: PostgreSQL (Supabase). **Schema**: `universal_products` (master profile) + `channel_adapters` (platform-specific IDs). **Location**: `supabase/migrations/`, `backend/app/db.py`.

## 3. Key Feature Modules ✓

### Module A: Attribute Extraction & Enrichment ✓

- **OCR**: Google Cloud Vision for label text. **Location**: `backend/app/services/ocr_service.py` (`run_ocr_google`).
- **Logic**: Label text (e.g. "100% Organic Cotton") → `Material` attribute. **Location**: `infer_material_from_text`, `enrich_attributes_from_ocr` in `ocr_service.py`; applied in `routes/vision.py` after VLM extraction.
- **Brand**: Optional known-brand DB cross-reference for logo/label. **Location**: `load_brands_db`, `match_brand_from_text` in `ocr_service.py`; configure via `BRANDS_DB_PATH`.

### Module B: Omnichannel Sync Engine ✓

- **Worker queue**: Celery + Redis. **Location**: `backend/app/tasks/sync_tasks.py`.
- **Tasks**: Push master profile to Shopify (GraphQL), Amazon (SP-API attribute mapping), Depop-style (photo + description). **Status**: Task signatures and return placeholders in place; implement API calls per platform.

### Module C: Audit Mode (Premium) ✓

- **Crowd-counting**: Placeholder for density map / multi-item count and bounding boxes. **Location**: `backend/app/services/audit_service.py`, `backend/app/routes/audit.py` (`POST /api/v1/audit/count`). **Next step**: Integrate Florence-2 or a density-estimation model.

## 4. Tech Stack ✓

| Component   | Specified     | Implemented                          |
|------------|---------------|--------------------------------------|
| Backend    | FastAPI       | FastAPI in `backend/`                 |
| Frontend   | Next.js 15    | Next.js 15 in `frontend/`             |
| AI         | Florence-2/GPT-4o | Gemini 2.0 Flash or GPT-4o       |
| Mobile     | React Native (Expo) | Not in repo; add `mobile/` and call same Vision API |
| Auth       | Clerk         | Clerk in Next.js (middleware, sign-in/sign-up, dashboard) |

## 5. Success Metrics (from brief)

- **Extraction accuracy**: >95% material/color — supported by OCR + VLM + material phrase list + optional brand DB.
- **Processing time**: <3s — async vision + optional OCR; tune timeouts and model choice.
- **Sync reliability**: Zero-latency across 3+ platforms — implement idempotent Celery tasks with retries and store `external_id` in `channel_adapters`.
