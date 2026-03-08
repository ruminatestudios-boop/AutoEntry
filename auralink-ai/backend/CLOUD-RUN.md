# Deploy SyncLyst backend to Google Cloud Run

Cloud Run scales to zero when idle and has a generous free tier (~2M requests/month). No cold-start delay like Render’s sleep.

## Prerequisites

- Google Cloud account
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and logged in: `gcloud auth login`

## 1. Create a project and enable APIs

```bash
# Create a project (or use an existing one)
gcloud projects create YOUR_PROJECT_ID --name="SyncLyst Backend"

# Enable required APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com --project=YOUR_PROJECT_ID
```

## 2. Build and deploy from the backend directory

From the **monorepo root** (SyncLyst), run:

```bash
cd auralink-ai/backend

# Build the container image and push to Google Artifact Registry, then deploy to Cloud Run
gcloud run deploy auralink-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project YOUR_PROJECT_ID
```

- `--source .` builds from the Dockerfile in the current directory and deploys.
- You’ll be prompted for the region if needed; `us-central1` is fine.
- When asked for the container image, accept the default (Artifact Registry in your project).

## 3. Set environment variables (secrets)

In [Cloud Console](https://console.cloud.google.com/run) → your service → **Edit & deploy new revision** → **Variables & secrets**:

Add at least:

- `GEMINI_API_KEY` – from [Google AI Studio](https://aistudio.google.com/apikey)
- **`CORS_ORIGINS`** = `https://synclyst.app,https://www.synclyst.app` (so the browser can call the API from synclyst.app)
- Any others your app needs (e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` if you use them)

Redeploy after adding variables.

## 4. Get the service URL

After deploy, Cloud Run shows the URL, e.g.:

`https://auralink-api-xxxxx-uc.a.run.app`

Or from the CLI:

```bash
gcloud run services describe auralink-api --region us-central1 --format='value(status.url)' --project YOUR_PROJECT_ID
```

## 5. Point synclyst.app at it

In **Vercel** (synclyst.app project):

- **Settings** → **Environment variables**
- Add: **AURALINK_BACKEND_URL** = `https://auralink-api-xxxxx-uc.a.run.app` (no trailing slash)
- Redeploy the frontend

Then the “Scan your first item” flow on synclyst.app will call your Cloud Run backend and extraction should work.

## Optional: deploy from GitHub (CI/CD)

You can also connect the repo to Cloud Build so every push to `main` rebuilds and deploys:

- [Cloud Build triggers](https://console.cloud.google.com/cloud-build/triggers) → Connect repo → set build config to use the Dockerfile in `auralink-ai/backend`.
