# Try AuraLink on your phone

Use the same Wi‑Fi as your computer and your phone’s browser. The app will use your computer’s IP so the phone can reach the frontend, backend, and publishing API. **Payment/checkout is not required for testing.**

---

## 1. Get your computer’s IP

- **Mac:** System Settings → Network → Wi‑Fi → Details (or run `ipconfig getifaddr en0` in Terminal).  
- **Windows:** `ipconfig` → look for “IPv4 Address” under your Wi‑Fi adapter (e.g. `192.168.1.5`).  
- **Linux:** `hostname -I` or `ip addr`.

Example: **192.168.1.5** (use yours).

---

## 2. Allow phone origins in CORS (one-time)

On the phone, the browser sends an origin like `http://192.168.1.5:3000`. The backend must allow it.

In **`auralink-ai/backend/.env`** either:

- **Easiest for testing:** set  
  `CORS_ORIGINS=*`  
  so any origin is allowed, or  
- **More specific:** add your IP to the list, e.g.  
  `CORS_ORIGINS=http://localhost:3000,http://192.168.1.5:3000,https://auralink.ai,https://www.auralink.ai`  
  (replace `192.168.1.5` with your IP).

Save the file and **restart the backend** (step 3).

---

## 3. Start the backend (must listen on all interfaces)

From **`auralink-ai/backend`**:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Leave this running. `--host 0.0.0.0` lets your phone reach the API at `http://YOUR_IP:8000`.

---

## 4. Start the publishing API (for flow: platform fields & publish)

From **`auralink-ai/publishing`**:

```bash
npm run dev
```

Leave this running. The flow (e.g. flow-verifying) will call `http://YOUR_IP:8001` when opened from the phone.

---

## 5. Start the frontend (phone mode)

From **`auralink-ai/frontend`**:

```bash
npm run dev:phone
```

This detects your LAN IP and starts the dev server with `NEXT_PUBLIC_API_URL=http://YOUR_IP:8000`, so the dashboard and landing use the right API. The flow pages (e.g. flow-verifying) automatically use the same host with port 8001 when opened from the phone.

**Or** manually:

```bash
NEXT_PUBLIC_API_URL=http://YOUR_IP:8000 npm run dev
```

The dev server already uses `--hostname 0.0.0.0`, so it’s reachable on your LAN.

---

## 6. On your phone

1. Connect the phone to the **same Wi‑Fi** as the computer.
2. In the phone’s browser open:
   - **Landing + scan:**  
     `http://YOUR_IP:3000/landing.html?mode=scan`  
     (e.g. `http://192.168.1.5:3000/landing.html?mode=scan`)
   - **Full flow (photo → connect → confirm):**  
     `http://YOUR_IP:3000/flow-1.html`
   - **Dashboard:**  
     `http://YOUR_IP:3000/dashboard`

Replace **YOUR_IP** with the IP from step 1.

The landing page and flow pages will use your computer’s IP for the backend (8000) and publishing API (8001), so no extra config on the phone is needed.

---

## 7. Quick check

- **Backend:** On the phone, open `http://YOUR_IP:8000/health`. You should see `{"status":"ok","service":"auralink-ai"}`.
- **Publishing API:** On the phone, open `http://YOUR_IP:8001/health`. You should see `{"status":"ok","service":"auralink-publishing-api"}`.
- **Scan:** Open `http://YOUR_IP:3000/landing.html?mode=scan` → allow camera (or use “Upload photo”) → capture → you should see “Reading your product” then the extracted result.
- **Flow:** Open `http://YOUR_IP:3000/flow-1.html` → go through capture → choose marketplaces → connect stores → verifying (confirm listing). Platform-specific fields and “Push live” will work when the publishing API is running.

---

## If it doesn’t work

- **“Couldn’t reach the server” / CORS / network error:**  
  Backend not reachable or CORS blocking. Check:  
  1) Backend started with `--host 0.0.0.0`.  
  2) Step 2: `CORS_ORIGINS=*` or your IP in the list, and backend restarted.  
  3) On the phone, `http://YOUR_IP:8000/health` loads.

- **Platform fields / “Push live” not working on phone:**  
  Start the publishing API (step 4). On the phone, `http://YOUR_IP:8001/health` should load.

- **Phone and computer on different networks:**  
  Use the same Wi‑Fi (phone not on cellular or guest network).

- **Firewall:**  
  Allow incoming connections on ports **3000**, **8000**, and **8001** for your local network (e.g. Mac: System Settings → Network → Firewall → Options; Windows: allow Node/python through firewall for private networks).

---

## Optional: script that prints the URLs

From **`auralink-ai/frontend`** you can run:

```bash
npm run phone-test
```

It will print your LAN IP and the exact URLs to open on the phone, plus the commands to start backend and frontend.
