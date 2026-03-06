# Convert auto-entry from submodule to normal folder

Run these in Terminal from the repo root (`AutoEntry Shopify copy`).

## 1. Remove submodule tracking (keep files)

```bash
cd "/Users/pritesh/Documents/GitHub/Complete/AutoEntry Shopify copy"
git rm --cached auto-entry
```

## 2. Remove auto-entry's .git so it's no longer a separate repo

```bash
rm -rf auto-entry/.git
```

## 3. Add all auto-entry files (including railway.toml)

```bash
git add auto-entry/
git status
```

## 4. Commit and push

```bash
git commit -m "Track auto-entry as regular folder, add railway.toml for Railway"
git push origin main
```

After this, the repo will have all app files in one place and Railway will get them when it clones. Root Directory = `auto-entry` will then work with the full code.
