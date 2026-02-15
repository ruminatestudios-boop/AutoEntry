# Auto Entry: From MVP to App Store - Implementation Plan

## Phase 1: Core Functionality & Logic (Current Status: ~95% Complete)
The "Scan-to-Shelf" engine is built.

- [x] **Mobile Scanning**: Capture image -> Upload -> AI Analysis.
- [x] **Product Extraction**: Gemini 1.5 Flash extracting Title, Description, Price, Tags.
- [x] **Shopify Listing**: Creating products via GraphQL.
- [x] **Manual Image Upload**: Users can add image URLs manually.
- [ ] **Automated Image Search (Parked)**:
    - [ ] Debug frontend-to-backend connection (button click logs).
    - [ ] Verify Google Custom Search API quotas and keys.
    - [ ] Handle "No results found" gracefully with suggestions.

## Phase 2: UI/UX Polish ("Better & Cleaner")
**Goal**: Move from "Developer Tool" look to "Premium SaaS" look.

### Dashboard (`app._index.tsx`)
- [x] **Hero Section**: Redesign the QR Code area. Make it a prominent "Action Center" with a call-to-action, not just a box.
- [x] **Recent Scans Grid**: Replace the simple list with a **Card Grid**.
    - Show product title, generated price, and a "Draft" badge.
    - Add a "Quick Action" to review immediately.
- [x] **Empty States**: If no scans exist, show a helpful illustration or guide.

### Review Modal
- [x] **Layout**: Use a 2-column layout (Images on left, Details on right) for desktop.
- [x] **Image Gallery**: Make the thumbnail list scrollable and drag-and-drop (if possible) or at least cleaner.
- [x] **Rich Text**: Ensure the HTML description is previewed correctly.

### Mobile Interface (`mobile.$sessionId.tsx`)
- [x] **Camera Overlay**: Add a "Scanner" frame overlay on the camera view.
- [x] **Processing Animation**: Replace simple text with a pulsing or "scanning" animation while AI thinks.

## Phase 3: Commercialization & Billing
**Goal**: Make the app monetizable.

- [x] **Billing Integration**:
    - [x] Add `shopify.billing` configuration.
    - [x] Create a "Pro Plan" (e.g., $9.99/mo) or "Pay per Scan" model.
    - [x] Gate the "List to Shopify" button behind a paywall check.
- [x] **Plan Selection Screen**: A pricing page to select plans.

## Phase 4: Production Readiness
**Goal**: Stability and Compliance.

- [x] **App Renaming**: Rename "AutoEntry" to "Vexo Scan" across the codebase and configuration.
- [x] **New Essential Pages**:
    - [x] **Support/Help Page**: `app.support.tsx` containing documentation and contact info.
    - [x] **Settings Page**: `app.settings.tsx` for app configuration.
    - [x] **Terms & Privacy**: Legal documents created in-app.
- [x] **Webhooks**: Implement `APP_UNINSTALLED` and GDPR mandatory webhooks.
- [ ] **Error Handling**: 
    - Global Error Boundary for crashes.
    - Network retry logic for AI requests.
- [ ] **Shopify Listing**: Create app icon, screenshots, and listing text.

## Phase 5: Deployment
- [ ] **Hosting**: Set up Fly.io or Vercel for the Remix app.
- [ ] **Database**: Migrate from local `dev.sqlite` to a production Postgres (e.g., Supabase or Neon).
- [ ] **Environment Variables**: Securely store API keys in production.
- [ ] **Submission**: Submit to Shopify App Store for review.
