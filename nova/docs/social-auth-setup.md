# Google + Apple sign-in setup

Wahrly uses Supabase Auth:

| Platform | Primary | Secondary |
|----------|---------|-----------|
| **Android** | Google (OAuth) | Email |
| **iOS** | Apple (native) + Google | Email |
| **Web** | Google + Apple (OAuth) | Email |

Phone/SMS is intentionally not used (cost + fraud).

## 1. Resume Supabase

Free projects pause after ~7 days idle. Dashboard → **Resume project**.

## 2. Enable providers in Supabase

**Authentication → Providers**

### Google
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID (**Web** application).
2. Authorized redirect URI (Supabase callback):
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Copy Client ID + Secret into Supabase → Google provider → Enable.
4. Optional: add **iOS** / **Android** OAuth clients (bundle `com.wahrly.assistant` / package `com.wahrly.assistant`) and paste those Client IDs into Supabase “Client IDs” list.

### Apple
1. Apple Developer → Identifiers → App ID `com.wahrly.assistant` → enable **Sign In with Apple** (Primary App ID).
2. Supabase → Apple → **Enable**; Client IDs: `com.wahrly.assistant` (native).
3. **iPhone native** (preferred): system sheet + `signInWithIdToken` — no Safari.  
   Build must have `usesAppleSignIn: true` (TestFlight **62+**).
4. **Secret Key** (required if Safari/OAuth opens — web or old fallback):
   1. Identifiers → **Services IDs** → + → `com.wahrly.assistant.web`  
      Configure Sign In with Apple → Domains: `whvcsbxbizuychqclxcx.supabase.co`  
      Return URL: `https://whvcsbxbizuychqclxcx.supabase.co/auth/v1/callback`
   2. **Keys** → + → Sign In with Apple → download `.p8`, note **Key ID**
   3. Generate JWT (expires every 6 months):
      ```bash
      node scripts/apple-client-secret.mjs \
        --team 7TLP9FNRJB \
        --key-id YOUR_KEY_ID \
        --client-id com.wahrly.assistant.web \
        --p8 ./AuthKey_XXXXX.p8
      ```
   4. Paste JWT into Supabase Apple → **Secret Key**.  
      Client IDs: `com.wahrly.assistant,com.wahrly.assistant.web`

## 3. Redirect URLs (Supabase → Authentication → URL configuration)

Add:

```
wahrly://auth/callback
https://ramza107.github.io/3proxy/nova/auth/callback
http://localhost:8081/auth/callback
```

Site URL can stay your production web app URL.

## 4. App env

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Optional — same Web client ID as in Supabase Google provider
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
```

## 5. Rebuild native apps

After adding `expo-apple-authentication` / `usesAppleSignIn`, run a new EAS build (Expo Go is limited for Apple).

```bash
npm run build:ios
npm run build:android
```

## Tester checklist

1. Supabase **not** paused  
2. Tap **Continue with Google** (Android / web / iOS)  
3. On iPhone: **Continue with Apple** native sheet  
4. Email/password still works as fallback  
5. Demo mode still available without an account  
