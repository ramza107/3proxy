# Wahrly — where keys live

Split is intentional: **the iPhone app is the product**. The website is only a preview. Server secrets never ship inside the app binary.

## 1. iOS / Android app (EAS)

Baked at **build time** via `eas.json` `env` + EAS project env (preview & production).

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Auth / sync |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe in client) |
| `EXPO_PUBLIC_API_URL` | Render AI / Calendar API |
| `EXPO_PUBLIC_APP_URL` | Native deep link base (`wahrly://`) |
| `EXPO_PUBLIC_PLATFORM` | `native` |
| `EXPO_PUBLIC_APP_ENV` | `production` |

Optional (off until set): `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_*`.

Changing these requires a **new EAS build** (TestFlight). Editing the website does **not**.

Google / Apple sign-in goes through **Supabase Auth** (providers in the Supabase dashboard). No Google client secret in the app.

## 2. Website (GitHub Pages)

Preview only: https://ramza107.github.io/3proxy/nova/

Keys for the web export live in `.github/workflows/deploy-github-pages.yml`. Use the site to look at UI/flows — not as the source of truth for production config.

## 3. API server (Render)

Secrets stay on Render (`render.yaml` / dashboard). Never put these in EAS or the app:

- `GROQ_API_KEY` / `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Calendar OAuth)

Health check: `https://threeproxy-x9bi.onrender.com/health`
