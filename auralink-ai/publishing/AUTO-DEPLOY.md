# Auto-deploy synclyst-publishing to Cloud Run

This folder has a `cloudbuild.yaml` so that **every push to `main`** can automatically deploy the publishing API to Cloud Run.

## One-time setup: create the trigger

1. Open **Google Cloud Console** → **Cloud Build** → **Triggers**:  
   https://console.cloud.google.com/cloud-build/triggers?project=YOUR_PROJECT_ID

2. Click **Create Trigger**.

3. Fill in:
   - **Name:** `synclyst-publishing-deploy`
   - **Region:** pick your region (e.g. us-central1) if shown.
   - **Event:** **Push to a branch**
   - **Source:** Connect your repo if needed, then choose **Synclyst** (or `ruminatestudios-boop/Synclyst`).
   - **Branch:** `^main$`
   - **Configuration:** **Cloud Build configuration file (yaml or json)**
   - **Cloud Build configuration file location:** **Repository**  
     Path: `auralink-ai/publishing/cloudbuild.yaml`
   - (Optional) **Included files filter:** `auralink-ai/publishing/**`  
     So only changes under this folder trigger a deploy.

4. Click **Create**.

After this, every push to `main` (that touches the publishing folder if you used the filter) will run the build and deploy **synclyst-publishing** to Cloud Run.

## Vercel (website)

Auto deploy is already on if the Vercel project is connected to the same GitHub repo and the production branch is `main`. No extra setup.
