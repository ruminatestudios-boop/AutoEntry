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
