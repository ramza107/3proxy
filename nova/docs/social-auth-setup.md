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
1. Apple Developer → Identifiers → App ID with **Sign In with Apple**.
2. Services ID (for web OAuth) if you need web Apple login.
3. Supabase → Apple provider → enable; add Services ID / Bundle ID as Client IDs.
4. Native iOS uses `expo-apple-authentication` → `signInWithIdToken` (no browser).

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
