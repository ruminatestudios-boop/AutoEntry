#!/usr/bin/env bash
# Redeploy publishing API to Cloud Run (Shopify OAuth, publish, compliance webhooks).
# Requires: gcloud CLI, auth (`gcloud auth login`), and Cloud Run + Build APIs enabled.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT_ID="${GCP_PROJECT_ID:-intrepid-axle-489519-u6}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${CLOUD_RUN_SERVICE:-synclyst-publishing}"

echo "Deploying ${SERVICE} to ${REGION} (project ${PROJECT_ID}) from ${ROOT}"
gcloud run deploy "${SERVICE}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --project "${PROJECT_ID}"

echo "URL:"
gcloud run services describe "${SERVICE}" --region "${REGION}" --project "${PROJECT_ID}" --format='value(status.url)'

# Remove stale dev-bypass env (legacy typo key included a tab character).
echo "Cleaning production env: removing SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION…"
gcloud run services update "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --remove-env-vars "SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION,SHOPIFY_DEV_TOKEN_APPLIES_IN_PRODUCTION	" \
  2>/dev/null || true

echo "Ensuring DISABLE_DEV_SHOPIFY_CONNECT_BYPASS=1 and FRONTEND_URL…"
gcloud run services update "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --update-env-vars "DISABLE_DEV_SHOPIFY_CONNECT_BYPASS=1,FRONTEND_URL=https://app.synclyst.app,NODE_ENV=production" \
  --quiet
