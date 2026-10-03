# Observability (optional — app works without these)

## Sentry (crashes)

1. Create a free project at [sentry.io](https://sentry.io) → React Native.
2. Copy the **DSN**.
3. Set in EAS secrets / `.env`:

```bash
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0
EXPO_PUBLIC_APP_ENV=production
```

4. Rebuild the native app (`eas build`) so the Sentry native module is linked.
5. Force a test: temporarily `throw new Error('sentry test')` on Home — it should appear in Sentry Issues within ~1 minute.

No DSN = monitoring is a complete no-op (safe for local/demo).

## PostHog (product analytics)

1. Create a free project at [posthog.com](https://posthog.com).
2. Project settings → **Project API key** (`phc_…`).
3. Set:

```bash
EXPO_PUBLIC_POSTHOG_KEY=phc_xxxx
# EU cloud (optional):
# EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

4. Redeploy web / restart Metro. Native rebuild **not** required (HTTP capture only).

### Events we send (no task titles / event details)

| Event | When |
|-------|------|
| `app_open` | App becomes ready |
| `auth_login` / `auth_signup` / `auth_demo` | Auth |
| `onboarding_complete` | Ready screen → start |
| `morning_brief_shown` | Morning brief sheet opens |
| `plan_day` | Plan day runs |
| `evening_clear_finish` | Evening Clear finished |
| `google_connect` | Calendar Allow succeeds |

## EAS secrets

```bash
cd nova
npx eas-cli secret:create --name EXPO_PUBLIC_SENTRY_DSN --value 'https://…' --type string
npx eas-cli secret:create --name EXPO_PUBLIC_POSTHOG_KEY --value 'phc_…' --type string
```

Then run a new TestFlight build.
