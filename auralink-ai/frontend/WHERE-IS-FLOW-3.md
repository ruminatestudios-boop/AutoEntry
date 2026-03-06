# Where flow-3.html lives and how to see your changes

The **Review your listing** page is this file:

```
auralink-ai/frontend/public/flow-3.html
```

Full path on your machine:

```
/Users/pritesh/Documents/GitHub/AutoEntry General/auralink-ai/frontend/public/flow-3.html
```

## Why you might still see the old page

1. **Dev server is running from a different folder**  
   If you run `npm run dev` from another copy of the project (e.g. not inside `AutoEntry General/auralink-ai/frontend`), the browser will serve that copy’s `flow-3.html`, not this one.

2. **Confirm you’re in the right project**  
   From Terminal:
   ```bash
   cd "/Users/pritesh/Documents/GitHub/AutoEntry General/auralink-ai/frontend"
   pwd
   npm run dev
   ```
   Then open: **http://localhost:3000/flow-3.html**

3. **Open the file directly (no server)**  
   In Finder, go to the path above and double‑click `flow-3.html`, or in the browser open:
   ```
   file:///Users/pritesh/Documents/GitHub/AutoEntry%20General/auralink-ai/frontend/public/flow-3.html
   ```
   If you see the new subtitle (“Use + to add photos, type and click Add for tags”), the file is correct and the issue is which server/URL you were using.

## What’s in the updated flow-3

- Subtitle: “Edit any field before publishing. **Use + to add photos, type and click Add for tags.**”
- Product: main photo + single “+” to add more photos, delete (×) on each photo.
- Tags: “Add tag…” input + Add button; each tag has × to remove.
- AI insights: driven by your listing (price, tag count, photo count).
