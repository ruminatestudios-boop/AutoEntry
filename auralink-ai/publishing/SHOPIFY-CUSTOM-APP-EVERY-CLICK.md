# Create a Shopify Custom app – every click

Use this when you want a **Custom app** (no App Store approval). Follow each step in order.

---

## 1. Open Partners and go to Apps

1. In your browser, go to **https://partners.shopify.com**
2. Log in if asked.
3. In the **left sidebar**, click **Apps**.

---

## 2. Start creating an app

4. Click the **Create app** button (top right of the Apps page).
5. In the menu that appears, click **Create app manually**.
   - If you see **Create custom app** instead, click that.
   - Do **not** click “Create app for the App Store” or anything that says “Public” or “App Store”.

---

## 3. Choose Custom distribution (if asked)

6. If you see a screen asking how to distribute your app:
   - Choose **Custom distribution** (install via link, one or more stores).
   - Do **not** choose “Public” or “App Store”.
7. Click **Select** or **Continue** (or whatever confirms your choice).

---

## 4. Name the app

8. Enter an **App name** (e.g. `SyncLyst` or `Sync-Lyst Custom`).
9. Click **Create app** or **Done**.

You should now be inside your new app’s dashboard.

---

## 5. Set the redirect URL

10. In the **left sidebar** of the app, click **Configuration** (or **App setup**).
11. Find the **URLs** section (or **Allowed redirection URL(s)**).
12. In **Redirect URL** (or **Redirection URL**), type exactly:
    - Local: `http://localhost:8001/auth/shopify/callback`
    - Production: `https://YOUR-PUBLISHING-URL/auth/shopify/callback`  
      (e.g. `https://synclyst-publishing-299567386855.us-central1.run.app/auth/shopify/callback`)
13. No trailing slash. Click **Save**.

---

## 6. Set API scopes

14. In the left sidebar, click **Configuration** (or **App setup**) if not already there.
15. Find **API access** or **Admin API access** or **Scopes**.
16. Enable these scopes (tick the boxes or add them):
    - `write_products`
    - `read_products`
    - `write_inventory`
17. Click **Save** if there is a Save button.

---

## 7. Get Client ID and Client secret

18. In the left sidebar, click **Client credentials** or **API credentials** (or stay in **Configuration** if that’s where they are).
19. Find **Client ID** → copy it. This is your **SHOPIFY_API_KEY**.
20. Find **Client secret** → click **Show** or **Reveal** if needed, then copy it. This is your **SHOPIFY_API_SECRET**.
21. Put both into your publishing service `.env` (see [SHOPIFY-CUSTOM-APP-SETUP.md](./SHOPIFY-CUSTOM-APP-SETUP.md)).

---

## 8. Generate the install link (to install on a store)

22. In the left sidebar, click **Distribution** (or **Test your app** / **Installation**).
23. In **Store domain**, type your store (e.g. `mystore` or `mystore.myshopify.com`).
24. Click **Generate link**.
25. Copy the full URL that appears.
26. Open that URL in your browser → log in to the store if asked → click **Install app** on the Shopify screen. You’ll be sent back to your app’s callback; then you’re done.

---

## Summary checklist

| Step | What you did |
|------|----------------|
| 1 | partners.shopify.com → **Apps** |
| 2 | **Create app** → **Create app manually** (not App Store) |
| 3 | **Custom distribution** (if asked) |
| 4 | App name → **Create app** |
| 5 | **Configuration** → Redirect URL → **Save** |
| 6 | **Configuration** → Scopes (write_products, read_products, write_inventory) → **Save** |
| 7 | **Client credentials** → copy Client ID + Client secret → put in `.env` |
| 8 | **Distribution** → Store domain → **Generate link** → open link → **Install app** |

If any menu name is different on your screen (e.g. “App setup” instead of “Configuration”), use the option that has **URLs**, **Scopes**, and **Client credentials**.
