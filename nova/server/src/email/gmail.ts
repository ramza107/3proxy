import crypto from 'crypto'
import { isInWindow, previousLocalDayWindow, type DayWindow } from './timeWindow.js'
import { deleteConnection, getConnection, saveConnection, type EmailConnection } from './store.js'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export type GmailMessagePreview = {
  id: string
  from: string
  fromName: string
  subject: string
  snippet: string
  date: string
  unread: boolean
}

export type SentMessagePreview = {
  id: string
  to: string
  toName: string
  toEmail: string
  subject: string
  snippet: string
  bodyText: string
  date: string
}

/** Inbox message with body — for meeting / important-intent detection. */
export type InboxMessagePreview = {
  id: string
  from: string
  fromName: string
  subject: string
  snippet: string
  bodyText: string
  date: string
  unread: boolean
}

export function gmailConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID || ''
  const secret = process.env.GOOGLE_CLIENT_SECRET || ''
  return Boolean(id && secret && !id.includes('your-google') && !secret.includes('your-google'))
}

export function getRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:8787'}/api/email/callback`
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
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

export function parseOAuthState(
  state: string,
): { userId: string; nonce: string; client: 'web' | 'native' } | null {
  try {
    // New format: body.sig
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

    // Legacy unsigned format (in-flight sessions)
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

  const profileRes = await fetch(`${GMAIL_API}/profile`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileRes.ok) throw new Error('Could not read Gmail profile')
  const profile = (await profileRes.json()) as { emailAddress?: string }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiryDate: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    email: profile.emailAddress || 'gmail',
  }
}

async function refreshAccessToken(conn: EmailConnection): Promise<EmailConnection> {
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
    throw new Error('Gmail access expired — reconnect in Settings')
  }
  const tokens = (await res.json()) as { access_token: string; expires_in?: number }
  const next: EmailConnection = {
    ...conn,
    accessToken: tokens.access_token,
    expiryDate: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : conn.expiryDate,
    updatedAt: new Date().toISOString(),
  }
  await saveConnection(next)
  return next
}

async function withFreshToken(userId: string): Promise<EmailConnection> {
  let conn = await getConnection(userId)
  if (!conn) throw new Error('Gmail not connected')
  if (conn.expiryDate && conn.expiryDate < Date.now() + 60_000) {
    conn = await refreshAccessToken(conn)
  }
  return conn
}

function headerValue(headers: { name: string; value: string }[] | undefined, name: string) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function parseFrom(raw: string): { from: string; fromName: string } {
  const m = raw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?$/)
  if (m) {
    const name = (m[1] || '').trim()
    const email = (m[2] || '').trim()
    return { from: email, fromName: name || email.split('@')[0] }
  }
  return { from: raw, fromName: raw.split('@')[0] || raw }
}

/** Previous local calendar day (Gmail epoch query + client-side filter). */
function previousDayQuery(window: DayWindow) {
  const afterSec = Math.floor(window.start.getTime() / 1000)
  const beforeSec = Math.floor(window.end.getTime() / 1000)
  return `after:${afterSec} before:${beforeSec} -category:promotions -category:social`
}

export async function listOvernightMessages(
  userId: string,
  opts?: { timeZone?: string | null; max?: number },
): Promise<GmailMessagePreview[]> {
  const conn = await withFreshToken(userId)
  const window = previousLocalDayWindow(opts?.timeZone)
  const max = opts?.max ?? 40
  const q = encodeURIComponent(previousDayQuery(window))
  const listRes = await fetch(`${GMAIL_API}/messages?maxResults=${max}&q=${q}`, {
    headers: { Authorization: `Bearer ${conn.accessToken}` },
  })
  if (!listRes.ok) {
    const text = await listRes.text()
    throw new Error(`Gmail list failed: ${text.slice(0, 200)}`)
  }
  const list = (await listRes.json()) as { messages?: { id: string }[] }
  const ids = (list.messages || []).map((m) => m.id)
  const previews: GmailMessagePreview[] = []

  for (const id of ids) {
    const msgRes = await fetch(
      `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${conn.accessToken}` } },
    )
    if (!msgRes.ok) continue
    const msg = (await msgRes.json()) as {
      id: string
      snippet?: string
      labelIds?: string[]
      internalDate?: string
      payload?: { headers?: { name: string; value: string }[] }
    }
    const fromRaw = headerValue(msg.payload?.headers, 'From')
    const { from, fromName } = parseFrom(fromRaw)
    const headerDate = headerValue(msg.payload?.headers, 'Date')
    const when = msg.internalDate
      ? new Date(Number(msg.internalDate))
      : headerDate
        ? new Date(headerDate)
        : null
    if (when && !Number.isNaN(when.getTime()) && !isInWindow(when, window)) continue

    previews.push({
      id: msg.id,
      from,
      fromName,
      subject: headerValue(msg.payload?.headers, 'Subject') || '(no subject)',
      snippet: msg.snippet || '',
      date: when && !Number.isNaN(when.getTime()) ? when.toISOString() : headerDate,
      unread: (msg.labelIds || []).includes('UNREAD'),
    })
  }

  return previews
}
function decodeBodyData(data?: string) {
  if (!data) return ''
  try {
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normalized, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

type MimePart = {
  mimeType?: string
  filename?: string
  body?: { data?: string; size?: number }
  parts?: MimePart[]
}

function collectPlainText(part: MimePart | undefined, depth = 0): string {
  if (!part || depth > 8) return ''
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeBodyData(part.body.data)
  }
  let out = ''
  for (const child of part.parts || []) {
    out += collectPlainText(child, depth + 1)
    if (out.length > 6000) break
  }
  if (!out && part.mimeType === 'text/html' && part.body?.data) {
    out = decodeBodyData(part.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
  }
  return out
}

function parseAddressList(raw: string): { to: string; toName: string; toEmail: string } {
  const first = raw.split(',')[0]?.trim() || raw
  const parsed = parseFrom(first)
  return {
    to: first,
    toName: parsed.fromName,
    toEmail: parsed.from,
  }
}

/** Recent SENT mail with body text — for open-loop / promise detection. */
export async function listRecentSentMessages(
  userId: string,
  opts?: { days?: number; max?: number },
): Promise<SentMessagePreview[]> {
  const conn = await withFreshToken(userId)
  const days = Math.min(30, Math.max(1, opts?.days ?? 7))
  const max = opts?.max ?? 25
  const afterSec = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const q = encodeURIComponent(`in:sent after:${afterSec}`)
  const listRes = await fetch(`${GMAIL_API}/messages?maxResults=${max}&q=${q}`, {
    headers: { Authorization: `Bearer ${conn.accessToken}` },
  })
  if (!listRes.ok) {
    const text = await listRes.text()
    throw new Error(`Gmail sent list failed: ${text.slice(0, 200)}`)
  }
  const list = (await listRes.json()) as { messages?: { id: string }[] }
  const ids = (list.messages || []).map((m) => m.id)
  const previews: SentMessagePreview[] = []

  for (const id of ids) {
    const msgRes = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    })
    if (!msgRes.ok) continue
    const msg = (await msgRes.json()) as {
      id: string
      snippet?: string
      internalDate?: string
      payload?: MimePart & { headers?: { name: string; value: string }[] }
    }
    const toRaw = headerValue(msg.payload?.headers, 'To')
    const addr = parseAddressList(toRaw || 'unknown')
    const headerDate = headerValue(msg.payload?.headers, 'Date')
    const when = msg.internalDate
      ? new Date(Number(msg.internalDate))
      : headerDate
        ? new Date(headerDate)
        : null
    const bodyText = collectPlainText(msg.payload).slice(0, 6000)

    previews.push({
      id: msg.id,
      to: addr.to,
      toName: addr.toName,
      toEmail: addr.toEmail,
      subject: headerValue(msg.payload?.headers, 'Subject') || '(no subject)',
      snippet: msg.snippet || '',
      bodyText,
      date: when && !Number.isNaN(when.getTime()) ? when.toISOString() : headerDate || '',
    })
  }

  return previews
}

/**
 * Recent INBOX mail (Primary-ish) with body text.
 * Excludes Promotions/Social noise; looks at the last `hours` (default 48).
 */
export async function listRecentInboxMessages(
  userId: string,
  opts?: { hours?: number; max?: number },
): Promise<InboxMessagePreview[]> {
  const conn = await withFreshToken(userId)
  const hours = Math.min(168, Math.max(6, opts?.hours ?? 48))
  const max = opts?.max ?? 30
  const afterSec = Math.floor((Date.now() - hours * 60 * 60 * 1000) / 1000)
  const q = encodeURIComponent(
    `in:inbox after:${afterSec} -category:promotions -category:social`,
  )
  const listRes = await fetch(`${GMAIL_API}/messages?maxResults=${max}&q=${q}`, {
    headers: { Authorization: `Bearer ${conn.accessToken}` },
  })
  if (!listRes.ok) {
    const text = await listRes.text()
    throw new Error(`Gmail inbox list failed: ${text.slice(0, 200)}`)
  }
  const list = (await listRes.json()) as { messages?: { id: string }[] }
  const ids = (list.messages || []).map((m) => m.id)
  const previews: InboxMessagePreview[] = []

  for (const id of ids) {
    const msgRes = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    })
    if (!msgRes.ok) continue
    const msg = (await msgRes.json()) as {
      id: string
      snippet?: string
      internalDate?: string
      labelIds?: string[]
      payload?: MimePart & { headers?: { name: string; value: string }[] }
    }
    const fromRaw = headerValue(msg.payload?.headers, 'From')
    const { from, fromName } = parseFrom(fromRaw)
    const headerDate = headerValue(msg.payload?.headers, 'Date')
    const when = msg.internalDate
      ? new Date(Number(msg.internalDate))
      : headerDate
        ? new Date(headerDate)
        : null
    const bodyText = collectPlainText(msg.payload).slice(0, 6000)

    previews.push({
      id: msg.id,
      from,
      fromName,
      subject: headerValue(msg.payload?.headers, 'Subject') || '(no subject)',
      snippet: msg.snippet || '',
      bodyText,
      date: when && !Number.isNaN(when.getTime()) ? when.toISOString() : headerDate || '',
      unread: (msg.labelIds || []).includes('UNREAD'),
    })
  }

  return previews
}
