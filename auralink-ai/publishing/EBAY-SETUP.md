# Connect eBay API to SyncLyst

SyncLyst uses eBay’s OAuth 2.0 and the Sell APIs (inventory, account) for listing. Follow these steps after creating your eBay developer account.

## 1. Get your keys

1. Go to [eBay Developer Program](https://developer.ebay.com) and sign in (use your **developer** login, not your normal eBay buyer/seller login).
2. Open **My Account** → **Application Keys** (or **Developer Account** → **Application Keys**).
3. Create an application or open an existing one.
4. Copy:
   - **App ID** (Client ID)
   - **Cert ID** (Client Secret)
5. For testing, use **Sandbox** keys. For live listings, use **Production** and complete the “Application Growth Check” when going live.

## 2. Create a RuName (Redirect URL) in eBay

eBay does **not** use a normal redirect URL in OAuth. It uses a **RuName** (Redirect URL name) that you create in the portal and then use as the `redirect_uri` in requests.

1. In the [eBay Developer Program](https://developer.ebay.com), go to **My Account** → **Application Keys**.
2. Next to your **App ID** (Sandbox), click **User Tokens**.
3. Under **Get a Token from eBay via Your Application**, if you see **“You have no Redirect URLs. Click here to add one”**, click it.
4. Complete the **Confirm the Legal Address** form and click **Continue to create RuName**.
5. On the next screen you’ll see your **RuName value** (a string like `YourName_YourName-ApplicationName-xxx-xxxx`). **Copy this value.**
6. Configure the RuName for user tokens:
   - **Auth Accepted URL:** `http://localhost:8001/auth/ebay/callback` (local) or `https://YOUR_PUBLISHING_DOMAIN/auth/ebay/callback` (production). This is where eBay sends the user after they approve.
   - **Auth Declined URL:** e.g. `http://localhost:3000/stores-connect-ebay.html` or your frontend.
   - **Privacy Policy URL** and **Display Title** as required.

Put the **RuName value** in `.env` as `EBAY_RUNAME` (see step 3). The OAuth `redirect_uri` in our app must be this RuName string, not the actual URL.

## 3. Configure SyncLyst publishing service

In `auralink-ai/publishing/`, create or edit `.env` (copy from `.env.example` if needed):

```env
# eBay (use sandbox for dev)
EBAY_CLIENT_ID=your-app-id-here
EBAY_CLIENT_SECRET=your-cert-id-here
# RuName from Application Keys → User Tokens → add Redirect URL → copy the RuName value
EBAY_RUNAME=YourName_YourApp-SBX-xxxxx
EBAY_ENV=sandbox
```

- **Sandbox:** `EBAY_ENV=sandbox` — uses `api.sandbox.ebay.com`.
- **Production:** `EBAY_ENV=production` — uses `api.ebay.com`.

Enable eBay in the list of platforms:

```env
ENABLED_PLATFORMS=shopify,ebay
```

(or add `ebay` to whatever list you already have).

Ensure your app URL is set so OAuth redirects work:

```env
APP_URL=http://localhost:8001
```

For production, set `APP_URL` to your publishing API URL (e.g. `https://publishing.synclyst.app`).

## 4. Restart the publishing service

Restart the publishing API so it loads the new env vars:

```bash
# If running via root monorepo
npm run dev:all

# Or from auralink-ai/publishing
npm run dev
# or
npm run start
```

## 5. Connect eBay in the app

1. Open the SyncLyst app (e.g. http://localhost:3000).
2. Go to **Stores** / **Connect store** (or the flow that lists eBay).
3. Choose **eBay** and start the connection.
4. You’ll be sent to eBay to sign in and authorize; after approving, you’re redirected back and eBay is connected.

## Scopes used

The app requests:

- `https://api.ebay.com/oauth/api_scope/sell.inventory` — create/update inventory and listings.
- `https://api.ebay.com/oauth/api_scope/sell.account` — account info.

Defined in `auralink-ai/publishing/src/auth/ebay.js` if you need to change them.

## Sandbox vs production

- **Sandbox:** Use for development and testing. Get a Sandbox token from the developer portal and test listing in the Sandbox environment.
- **Production:** When ready to go live, switch to production keys, set `EBAY_ENV=production`, and complete eBay’s Application Growth Check as mentioned in their “Going live” steps.

## Troubleshooting

- **“eBay app not configured”** — `EBAY_CLIENT_ID` or `EBAY_CLIENT_SECRET` is missing in `.env`; restart the publishing service after adding them.
- **“The OAuth client was not found” (401)** — You must create a **RuName** in eBay (Application Keys → User Tokens → add Redirect URL), set **Auth Accepted URL** to `http://localhost:8001/auth/ebay/callback`, and put the **RuName value** in `.env` as `EBAY_RUNAME`. The OAuth `redirect_uri` must be this RuName string, not the URL.
- **“EBAY_RUNAME is required”** — Add the RuName value from the eBay portal to `.env` (see above).
- **Redirect URI mismatch** — Auth Accepted URL in the RuName form must be exactly your callback URL (e.g. `http://localhost:8001/auth/ebay/callback`).
- **Developer login** — Use your eBay **developer** account to sign in to the developer portal; it’s separate from your normal eBay login.
