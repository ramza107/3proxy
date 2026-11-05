# Wahrly

```
wahrly/
  app/    # Expo iOS/Android app + API server (app/server)
  site/   # Static landing, Privacy, Terms (GitHub Pages)
```

- **App:** `cd app` → Expo / EAS (`com.wahrly.assistant`)
- **Site:** `site/` → https://ramza107.github.io/wahrly/
- **API:** `app/server` on Render (`rootDir: app/server`)

Rename this GitHub repository to `wahrly` (Settings → Repository name) if it is still called `3proxy`. Then update your local remote:

```bash
git remote set-url origin https://github.com/ramza107/wahrly.git
```
