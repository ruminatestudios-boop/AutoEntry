# SyncLyst – App flow & logic

User journey and application logic only (no deployment steps). Use this to see **what the app does** and **how the flow works**.

---

## 1. User flow (step-by-step)

1. **Landing** – User sees the landing page. They click **“Scan Your First Item”**.
2. **Scan view** – App shows camera + upload. User captures a product photo or uploads an image.
3. **Extract** – App sends the image to the backend. Backend runs vision + OCR, then optional web enrichment (exact product name, description, average price). Result is saved as a draft and the app redirects to the “Reading your product” screen.
4. **Reading your product (flow-2)** – App shows a progress bar and checklist (title & description, SEO tags, etc.). When progress reaches 100%, the app automatically goes to the next step.
5. **Confirm your listing (flow-3)** – App loads the draft (title, description, price, photos, category, tags, etc.). User can edit any field. Stores (e.g. Shopify) are shown; only Shopify is selectable (others “Coming soon”). User clicks **Next** (“Publish to Shopify”).
6. **Publish logic** – If the user is not connected to Shopify, the app redirects to **Connect Shopify**. If connected, the app gets a token, creates a listing via the publishing API, then publishes that listing to Shopify (product is created in the store as a **draft**). Then the app redirects to the success page.
7. **Connect Shopify** – User enters their store domain. App gets a token and redirects to Shopify OAuth. User approves the app in Shopify. Shopify redirects back to the app; the app stores the connection and can send the user back to the flow (e.g. confirm step or success).
8. **Success** – App shows “You’re live!” and options: **List another** (starts the scan flow again) or **View listings** (dashboard).

**Alternate paths**

- **Choose marketplaces (flow-marketplaces)** – User can select where to list (Shopify only active); from there they can go to Connect Shopify, then later to confirmation/publish.
- **Verifying (flow-verifying)** – Another confirmation screen with a modal; “Push live” does the same create + publish to Shopify.
- **flow-connect-done** – “All connected!” then link to the verifying/confirmation step.

---

## 2. App logic (what happens under the hood)

- **Draft storage** – Draft is kept in the browser (sessionStorage): `auralink_draft_listing` (from extraction), `auralink_review_draft` (from confirm step), `auralink_selected_marketplaces` (e.g. Shopify), `auralink_jwt` (token for publishing API).
- **New scan** – When the user starts a new scan, the old review draft is cleared so the confirm step shows the new product, not the previous one.
- **Extraction** – Backend: image → vision model (title, description, attributes, category) → optional OCR (text from image) → optional web enrichment (exact product name, full description, bullets, average price in GBP). Response is returned and the frontend saves it into the draft.
- **Publish** – Frontend builds a “universal” listing (title, description, price, photos, etc.), gets a JWT (or dev-token), calls **POST /api/listings** to create the listing, then **POST /api/listings/publish** with that listing id and `platforms: ['shopify']`. Publishing service creates the product in Shopify as a draft.
- **Connect store** – Frontend gets a user id and token from the publishing service, then redirects to the publishing service’s Shopify OAuth URL with `return_to` so after approval the user comes back to the right page.

---

## 3. Features list (what the app does)

- Scan a product with **camera** or **upload**.
- **AI extraction** from image: title, description, category, attributes (brand, model, colour, etc.), optional price from image.
- **Web enrichment**: look up product online for exact name, full description, bullet points, and average price across retailers (best-effort).
- **Draft** stored in the browser; user can move through the flow and come back without losing data (until they start a new scan).
- **Progress screen** (“Reading your product”) with progress bar and steps, then auto-redirect to confirm.
- **Confirm your listing**: edit title, description, price, photos, category, tags, status (Active/Draft), meta description, etc.; see listing quality / readiness.
- **Stores**: only **Shopify** is active; Etsy, eBay, Amazon, TikTok Shop, etc. shown as “Coming soon.”
- **Connect Shopify**: enter store domain → Shopify OAuth → store linked to the app.
- **Publish to Shopify**: one action (e.g. Next on confirm) creates the listing and publishes it to the connected store as a **draft** product.
- **Success screen**: “You’re live!”, option to list another (full scan flow) or view listings.
- **Scan another** on result/confirm screens to start a new scan without going back to the landing hero.
- **Extract again** on the scan result to re-run extraction on the same image.
- **Listing quality** hints on the confirm step (title length, description, photos, price, tags, etc.).

---

## 4. Pages in the flow (reference)

| Page | Role in flow |
|------|----------------|
| Landing | Entry; “Scan Your First Item” → scan view (`?mode=scan`). |
| Landing (scan view) | Camera/upload → extract → redirect to flow-2. |
| flow-2 | “Reading your product”; progress → auto to flow-3. |
| flow-3 | Confirm your listing; edit draft; Next = publish (or go to Connect). |
| `/connect-store` | Enter store → OAuth → return to flow. |
| flow-connect-done | “All connected!” → link to verifying/confirm. |
| flow-verifying | Confirm modal; “Push live” = create + publish. |
| flow-marketplaces | Choose Shopify (or others when enabled); Connect. |
| flow-success | “You’re live!”; List another / View listings. |
| flow-1 | Legacy step (no camera); not used in main “Scan Your First Item” path. |

For deployment and environment setup, use **LAUNCH-CHECKLIST.md** or **STEP-BY-STEP.md**.

---

## 5. What's missing and not working (app logic)

These are **logic and flow gaps** only (no deployment). Fix these so the app behaves as intended.

### Broken or incomplete flows

| Issue | What's wrong | What to do |
|-------|----------------|------------|
| **Dashboard "Scan new product" / "List another"** | Both link to **flow-1**. flow-1 has no camera and no extraction; it only has "Continue" / "Skip" to flow-2. flow-2 then expects `auralink_pending_scan` (image base64); without it, flow-2 redirects back to `landing.html?mode=scan`. So from the dashboard you never actually start a scan—you eventually land on the scan page after a redirect. | Point "Scan new product" and "list a new item" on dashboard-home to **`/landing.html?mode=scan`** (same as flow-success "List another") so the user goes straight to the real scan flow. |
| **flow-2 when draft exists but no image** | flow-2 only checks **`auralink_pending_scan`** (base64). If the app ever sends the user to flow-2 after saving **`auralink_draft_listing`** without setting `auralink_pending_scan` (e.g. a "Continue to confirm" on landing that only saves the draft and redirects), flow-2 will redirect back to `landing.html?mode=scan` and the user never reaches flow-3. | In flow-2, if there is no `pending_scan` but **`auralink_draft_listing`** exists, run the progress animation and then redirect to flow-3 instead of redirecting to scan. |
| **"Continue with sample listing"** | Button appears on the landing scan result but has **no click handler**. It does nothing. | Either wire it (e.g. save current draft and go to flow-3 or flow-2) or remove/hide it. |

### Missing or fake data

| Issue | What's wrong | What to do |
|-------|----------------|------------|
| **"View listings" on success** | Links to **dashboard-home**. Dashboard-home shows **hardcoded** stats (e.g. "84 listed", "67 sold", "Morning, James") and does not load the listing that was just published (or any real data from the publishing API or backend). | Load real data: e.g. call publishing API or backend for the user's listings and show them on dashboard-home; or link "View listings" to a page that does. |
| **Dashboard-home "Scan new product"** | Same as above: goes to flow-1, so no real scan. | Point to **`/landing.html?mode=scan`**. |

### Partial / best-effort behaviour

| Issue | What's wrong | What to do |
|-------|----------------|------------|
| **Web enrichment (exact name, description)** | Uses Gemini; search grounding can fail (e.g. tool not supported or API limits). Fallback uses model knowledge only, so output can still be **generic** ("Wireless earbuds" instead of "Nothing Ear (stick)"). | Keep as best-effort, or add a retry / different provider when enrichment fails; or surface "Couldn't find exact match" in the UI. |
| **Average price from web** | Same enrichment step returns **average_price_gbp** when it can; not guaranteed for every product. | Leave as best-effort; UI already shows "Average across UK retailers" when present. |

### Auth and identity

| Issue | What's wrong | What to do |
|-------|----------------|------------|
| **No real sign-in** | The flow uses **dev-token** (get-or-create dev user or in-memory dev user when Supabase is missing). There is no login or user identity for production. | For production, add real auth (e.g. Clerk), pass user id and JWT to connect and publish, and remove or restrict dev-token. |

### Optional / edge cases

| Issue | What's wrong | What to do |
|-------|----------------|------------|
| **flow-1** | No camera, no upload, no extraction. Only used when linked from dashboard or legacy links. | Either add camera/upload + extraction to flow-1 so it's a real scan step, or stop linking to it and use **landing.html?mode=scan** everywhere. |
| **"Save as draft" on landing** | Calls **`/api/v1/products/from-extraction`** (backend). That draft is separate from the **publish flow** draft (sessionStorage). So "Save as draft" does not feed into the "Confirm your listing" / "Push live" path. | Decide: either make "Save as draft" write to the same draft the publish flow uses (e.g. sessionStorage + optional backend), or document that it's a different (backend-only) draft. |
| **After Connect from flow-marketplaces** | User returns to **flow-connect-done** ("All connected!") and must click again to reach flow-verifying or flow-3. Slightly unclear. | Optional: from flow-connect-done, auto-redirect to flow-3 or flow-verifying when coming from flow-marketplaces so the next step is obvious. |

---

**Summary**

- **Fix first:** Dashboard "Scan new product" / "List another" → **landing.html?mode=scan**; flow-2 accept **draft_listing** when no **pending_scan**; wire or remove "Continue with sample listing".
- **Then:** "View listings" and dashboard-home use **real listing data**; optional cleanup of flow-1 and "Save as draft" semantics.
