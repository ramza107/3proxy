# Wahrly — iPhone & Android apps (Expo EAS)

Wahrly is one Expo codebase (same features as the web demo on GitHub Pages). Native installs are built with [EAS Build](https://docs.expo.dev/build/introduction/).

| Platform | Bundle ID | Deep link after Gmail OAuth |
|----------|-----------|-----------------------------|
| iOS | `com.wahrly.assistant` | `wahrly://settings?gmail=connected` |
| Android | `com.wahrly.assistant` | `wahrly://settings?gmail=connected` |
| Web | GitHub Pages | `https://ramza107.github.io/3proxy/nova/settings?...` |

## Prerequisites

1. [Expo account](https://expo.dev/signup) (free)
2. **Apple Developer** account — required for TestFlight / device builds
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

## TestFlight (friends can install)

### A. Create the app in App Store Connect (once)

1. Open [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+**
2. Bundle ID: **com.wahrly.assistant**
3. Name: Wahrly · SKU: e.g. `wahrly1`

### B. Build + upload from your PC

```bash
cd C:\Users\rrali\3proxy\nova
git pull
npm install --legacy-peer-deps

# One command: production build AND submit to TestFlight
npm run build:ios:testflight
```

Or step by step:

```bash
npm run build:ios:prod
npm run submit:ios
```

Sign in with Apple ID when EAS asks. First upload can take 10–30+ minutes to process in App Store Connect.

### C. Invite people

1. App Store Connect → your app → **TestFlight**
2. Answer **Export Compliance** if prompted (usually encryption = HTTPS only → No)
3. **Internal Testing** — add yourself / team (fastest)
4. **External Testing** — add friends by email or public link (Apple may do a short review)

Friends install **TestFlight** from the App Store, open the invite, then Install Wahrly.

### D. Later updates

```bash
git pull
npm run build:ios:testflight
```

Friends get an **Update** button in TestFlight.

## Preview / internal (your device only)

```bash
npm run build:ios
```

Each device must be registered. Prefer **TestFlight** for sharing with friends.

## Android APK (optional)

```bash
npm run build:android
```

## Local smoke test (Expo Go)

```bash
cd nova
npm start
# scan QR with Expo Go
```

## Server note

`/api/email/connect?client=native` returns to `wahrly://settings?gmail=…` after Google Allow (web still uses Pages URL).
