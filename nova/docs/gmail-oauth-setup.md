# Gmail OAuth — one-time product setup (for the app owner)

Users never see this. They only tap **Connect with Google → Allow**.

## 1. Google Cloud project
1. Open https://console.cloud.google.com/
2. Create (or pick) a project, e.g. `Wahrly`

## 2. Enable Gmail API
1. APIs & Services → Library  
2. Search **Gmail API** → Enable

## 3. OAuth consent screen
1. APIs & Services → OAuth consent screen  
2. User type: **External**  
3. App name: `Wahrly`  
4. Support email: your email  
5. **Privacy policy link** (required for verification):  
   `https://ramza107.github.io/3proxy/nova/privacy`  
6. Scopes → Add `https://www.googleapis.com/auth/gmail.readonly`  
7. Test users → add your Gmail (while app is in Testing)

Source text for the policy: [`privacy-policy.md`](privacy-policy.md) / in-app route `/privacy`.

## 4. Create OAuth client
1. APIs & Services → Credentials → **Create credentials** → OAuth client ID  
2. Application type: **Web application**  
3. Name: `Wahrly web`  
4. Authorized redirect URIs — add exactly:
   ```
   https://threeproxy-x9bi.onrender.com/api/email/callback
   ```
5. Create → copy **Client ID** and **Client Secret**

## 5. Put keys on Render (AI server)
Environment variables:
- `GOOGLE_CLIENT_ID` = (Client ID)
- `GOOGLE_CLIENT_SECRET` = (Client Secret)
- `GOOGLE_REDIRECT_URI` = `https://threeproxy-x9bi.onrender.com/api/email/callback`
- `PUBLIC_APP_URL` = `https://ramza107.github.io/3proxy/nova/`
- `PUBLIC_NATIVE_APP_URL` = `wahrly://` (iPhone/Android return after Google Allow)
- `PUBLIC_API_URL` = `https://threeproxy-x9bi.onrender.com`

Redeploy the service.

## 6. Try it
Settings → **Connect with Google** → Allow → Home shows Morning inbox.

On the installed iOS/Android app the same button returns via `wahrly://settings?gmail=connected`.
