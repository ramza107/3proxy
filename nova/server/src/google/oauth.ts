/**
 * Google OAuth + token refresh for Calendar (read-only).
 * No Gmail / mail API access.
 */
import crypto from 'crypto'
import { deleteConnection, getConnection, saveConnection, type GoogleConnection } from './store.js'

const CALENDAR_READONLY = 'https://www.googleapis.com/auth/calendar.readonly'
const USERINFO_EMAIL = 'https://www.googleapis.com/auth/userinfo.email'
/** Calendar read + email for the connected account label. */
const GOOGLE_SCOPES = `${CALENDAR_READONLY} ${USERINFO_EMAIL}`
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export function googleConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID || ''
  const secret = process.env.GOOGLE_CLIENT_SECRET || ''
  return Boolean(id && secret && !id.includes('your-google') && !secret.includes('your-google'))
}

export function getRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:8787'}/api/google/callback`
  )
}

export function getAppReturnUrl() {
  return process.env.PUBLIC_APP_URL || 'https://ramza107.github.io/3proxy/nova/'
}

/** Deep link used after OAuth on installed iOS/Android apps. */
export function getNativeAppReturnUrl() {
  return process.env.PUBLIC_NATIVE_APP_URL || 'wahrly://'
}

export function resolveAppReturnUrl(client: 'web' | 'native' = 'web') {
  if (client === 'native') {
    return getNativeAppReturnUrl().replace(/\/?$/, '/')
  }
  return getAppReturnUrl().replace(/\/?$/, '/')
}

function oauthStateSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_STATE_SECRET || 'wahrly-dev-oauth'
}

/** Signed OAuth state — survives Render cold starts (no in-memory nonce required). */
export function buildAuthUrl(userId: string, _stateNonce: string, client: 'web' | 'native' = 'web') {
  const payload = {
    userId,
    client,
    exp: Date.now() + 15 * 60 * 1000,
    n: crypto.randomBytes(8).toString('hex'),
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', oauthStateSecret()).update(body).digest('base64url')
  const state = `${body}.${sig}`

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    // Force consent so older grants that included Gmail scopes are replaced.
    prompt: 'consent',
    include_granted_scopes: 'false',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

export function parseOAuthState(
  state: string,
): { userId: string; nonce: string; client: 'web' | 'native' } | null {
  try {
    if (state.includes('.')) {
      const [body, sig] = state.split('.')
      if (!body || !sig) return null
      const expect = crypto.createHmac('sha256', oauthStateSecret()).update(body).digest('base64url')
      if (sig !== expect) return null
      const raw = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
      if (!raw?.userId || !raw?.exp || Number(raw.exp) < Date.now()) return null
      const client: 'web' | 'native' =
        raw.client === 'native' || raw.client === 'mobile' ? 'native' : 'web'
      return {
        userId: String(raw.userId),
        nonce: String(raw.n || ''),
        client,
      }
    }

    const raw = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
    if (!raw?.userId || !raw?.nonce) return null
    const client: 'web' | 'native' =
      raw.client === 'native' || raw.client === 'mobile' ? 'native' : 'web'
    return { userId: String(raw.userId), nonce: String(raw.nonce), client }
  } catch {
    return null
  }
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiryDate: number | null
  email: string
}> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
  })

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed (${tokenRes.status})`)
  }
  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const profileRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) throw new Error('Could not read Google profile')
  const profile = (await profileRes.json()) as { email?: string }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiryDate: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    email: profile.email || 'google',
  }
}

async function refreshAccessToken(conn: GoogleConnection): Promise<GoogleConnection> {
  if (!conn.refreshToken) return conn
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: conn.refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    await deleteConnection(conn.userId)
    throw new Error('Google access expired — reconnect in Settings')
  }
  const tokens = (await res.json()) as { access_token: string; expires_in?: number }
  const next: GoogleConnection = {
    ...conn,
    accessToken: tokens.access_token,
    expiryDate: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : conn.expiryDate,
    updatedAt: new Date().toISOString(),
  }
  await saveConnection(next)
  return next
}

async function withFreshToken(userId: string): Promise<GoogleConnection> {
  let conn = await getConnection(userId)
  if (!conn) throw new Error('Google not connected')
  if (conn.expiryDate && conn.expiryDate < Date.now() + 60_000) {
    conn = await refreshAccessToken(conn)
  }
  return conn
}

/** Shared by Calendar routes — refresh access token when needed. */
export { withFreshToken }
