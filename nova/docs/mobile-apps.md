# Wahrly — iPhone & Android apps (Expo EAS)

Wahrly is one Expo codebase. Native installs are built with [EAS Build](https://docs.expo.dev/build/introduction/).

| Platform | Bundle ID | Deep link after Gmail OAuth |
|----------|-----------|-----------------------------|
| iOS | `com.wahrly.assistant` | `wahrly://settings?gmail=connected` |
| Android | `com.wahrly.assistant` | `wahrly://settings?gmail=connected` |
| Web | GitHub Pages | `https://ramza107.github.io/3proxy/nova/settings?...` |

## Prerequisites

1. [Expo account](https://expo.dev/signup) (free)
2. Apple Developer account — required for TestFlight / App Store (not for Expo Go)
3. Google Play Console — required for Play Store (APK preview builds work without it)
4. Same backend as the website: Render API + Supabase + Gmail OAuth keys

Optional env on your machine:

```bash
export EXPO_TOKEN=...   # from https://expo.dev/settings/access-tokens
```

## One-time: link the project

```bash
cd nova
npm install --legacy-peer-deps
npx eas-cli login          # or EXPO_TOKEN
npx eas-cli init          # creates EAS projectId → writes into app config
```

Copy the printed `projectId` into `app.config.js` / EAS dashboard if needed.

## Build installable apps

### Preview (internal testing — APK + iOS ad-hoc / simulator)

```bash
cd nova

# Android APK (install on phone via link)
npm run build:android

# iOS (needs Apple credentials on first run)
npm run build:ios
```

Or both:

```bash
npm run build:mobile
```

EAS prints a download URL when each build finishes. Install on device, open Wahrly, sign in, Settings → **Connect with Google** → Allow → app should reopen via `wahrly://`.

### Production (stores)

```bash
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform android --profile production
npx eas-cli submit --platform ios --profile production
```

## Local without stores (Expo Go)

Quick smoke test (JS only — push / some native modules limited):

```bash
cd nova
npm start
# scan QR with Expo Go on phone
```

For a real “app icon on home screen” build, use EAS preview above.

## Server note (already in this branch)

`/api/email/connect?client=native` stores the client on the OAuth nonce. After Google Allow, the callback redirects to:

- native → `wahrly://settings?gmail=connected`
- web → `PUBLIC_APP_URL/settings?gmail=connected`

Set on Render (optional, default is fine):

```
PUBLIC_NATIVE_APP_URL=wahrly://
```

Google Cloud still uses the **same** web redirect URI:

```
https://threeproxy-x9bi.onrender.com/api/email/callback
```

No extra Google client is required for the custom scheme — the server bridges to `wahrly://`.

## Files

- `eas.json` — development / preview / production profiles
- `app.config.js` — native vs web `baseUrl`, scheme, icons
- `app.json` — static defaults (merged by Expo)
