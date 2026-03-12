# Fix: Push to Shopify not creating products (token not found)

If "Connect store" works but when you **Push to Shopify** nothing appears in Shopify (or you get an error about not connected), the publishing service is not finding your Shopify token.

---

## Why it happens

On **Cloud Run**, the publishing service can run on more than one instance. When you click **Connect store**, the token is saved. If you don't use a **database**, that token is only in that instance's **memory**. When you later click **Push to Shopify**, another request may go to a different instance (or the same one may have restarted), and that instance has **no token** — so the push fails or does nothing.

So: **without a database, tokens don't persist** across requests/instances.

---

## Fix: persist tokens with Supabase

1. **Create a Supabase project** (or use an existing one) and get:
   - **Project URL** → `SUPABASE_URL`
   - **Service role key** (Settings → API → service_role) → `SUPABASE_SERVICE_KEY`

2. **Run the schema** in Supabase (SQL Editor):
   - Copy the contents of `auralink-ai/publishing/src/db/schema.sql`
   - Run it in the Supabase SQL editor so tables `users`, `platform_tokens`, `listings`, `publish_results` exist.

3. **Support dev/local user**  
   The schema uses `user_id UUID REFERENCES users(id)`. The dev flow uses user id `dev-local`. Either:
   - Insert a dev user and use its UUID in the callback, or
   - Temporarily allow a string dev user (e.g. add a row in `users` with a fixed UUID and map `dev-local` to it in your code).  
   Simplest: in Supabase SQL, run:
   ```sql
   INSERT INTO users (id, email, created_at) 
   VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'dev-local@synclyst.app', now())
   ON CONFLICT DO NOTHING;
   ```
   Then in the publishing service, when you store the token for `dev-local`, store it under this UUID (or change the auth middleware to accept dev-token and map to this UUID).  
   *Alternatively*, if your schema already uses `TEXT` for `user_id` in `platform_tokens`, you don't need the users row — just ensure the schema matches what the code expects.

4. **Set env vars on Cloud Run**  
   In the publishing service (e.g. Cloud Run → synclyst-publishing → Edit → Variables & secrets), add:
   - `SUPABASE_URL` = your Supabase project URL  
   - `SUPABASE_SERVICE_KEY` = your Supabase service role key  

5. **Redeploy** the publishing service.

6. **Reconnect the store**  
   On synclyst.app, go to Connect Shopify again and complete the flow. The token will be stored in Supabase.

7. **Push again**  
   Run the full flow (scan → review → Push to Shopify). The same or another instance will load the token from the DB and the product should be created in Shopify (usually under **Products → Drafts**).

---

## If you can't add Supabase right now

- **Reconnect**, then **immediately** (within a minute or two) do **one** full flow: scan → review → **Push to Shopify**. Sometimes the same Cloud Run instance serves both requests and still has the token in memory. This is not reliable; use Supabase for a permanent fix.
