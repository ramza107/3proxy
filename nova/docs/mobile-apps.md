# Wahrly — iPhone & Android apps (Expo EAS)

Wahrly is one Expo codebase (same features as the web demo on GitHub Pages). Native installs are built with [EAS Build](https://docs.expo.dev/build/introduction/).

| Platform | Bundle ID | Deep link after Gmail OAuth |
|----------|-----------|-----------------------------|
| iOS | `com.wahrly.assistant` | `wahrly://settings?gmail=connected` |
| Android | `com.wahrly.assistant` | `wahrly://settings?gmail=connected` |
| Web | GitHub Pages | `https://ramza107.github.io/3proxy/nova/settings?...` |

## Prerequisites

1. [Expo account](https://expo.dev/signup) (free)
2. **Apple Developer** account — required to install on a physical iPhone (TestFlight / device build)
3. Same backend as the website: Render API + Gmail OAuth (`PUBLIC_NATIVE_APP_URL=wahrly://`)

Optional:

```bash
export EXPO_TOKEN=...   # https://expo.dev/settings/access-tokens
```

## One-time: link the project

```bash
cd nova
npm install --legacy-peer-deps
npx eas-cli login
npx eas-cli init          # writes EAS projectId
```

## Build iPhone app (preview / internal)

```bash
cd nova
npm run build:ios
```

EAS will ask for Apple credentials the first time. When the build finishes, open the URL EAS prints:

- **TestFlight** (recommended) or install profile on your device
- Or use `eas build:run -p ios` after a simulator build (`development` profile)

Android APK (optional):

```bash
npm run build:android
```

## Local smoke test (Expo Go)

```bash
cd nova
npm start
# scan QR with Expo Go
```

Push notifications and some native modules are limited in Expo Go — use an EAS preview build for the real app.

## Server note

`/api/email/connect?client=native` stores the client on the OAuth nonce. After Google Allow, the callback redirects to `wahrly://settings?gmail=…` (web still uses Pages URL).
