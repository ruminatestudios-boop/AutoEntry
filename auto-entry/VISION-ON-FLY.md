# Optional: Google Cloud Vision on Fly (OCR in production)

If you want **OCR** from product images in production (better extraction of text from packaging), set a Vision API key on Fly. Without it, the app still works; Gemini analyzes images without the OCR step.

---

## 1. Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable **Cloud Vision API** (APIs & Services → Enable APIs).
4. Create a **service account** (IAM & Admin → Service accounts), grant it access to Vision (e.g. “Cloud Vision API User” or project Editor for simplicity).
5. Create a **JSON key** for that service account and download it (e.g. `vision-key.json`). Keep it private.

---

## 2. Fly secret

From your machine, in the **auto-entry** app directory:

```bash
cd /path/to/auto-entry
fly secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat /path/to/vision-key.json)"
```

Or with base64 (if the JSON has newlines that cause issues):

```bash
fly secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(base64 < /path/to/vision-key.json)"
```

Then redeploy or restart the app so the new secret is picked up.

---

## 3. What the app does

On startup, `scripts/write-vision-credentials.cjs` runs. If `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set, it writes the key to `/tmp/vision-credentials.json`. The app already has `GOOGLE_APPLICATION_CREDENTIALS=/tmp/vision-credentials.json` in `fly.toml`, so the Vision client will use it for OCR. No code changes needed.

---

**Summary:** Create GCP service account + JSON key → `fly secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat key.json)"` → redeploy.
