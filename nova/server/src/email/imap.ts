import crypto from 'crypto'
import { ImapFlow } from 'imapflow'
import type { GmailMessagePreview } from './gmail.js'
import { getConnection, saveConnection, type EmailConnection } from './store.js'
import { isInWindow, previousLocalDayWindow } from './timeWindow.js'

function secretKey() {
  const raw =
    process.env.EMAIL_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'wahrly-dev-email-secret'
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(text: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function decryptSecret(payload: string) {
  const buf = Buffer.from(payload, 'base64url')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

function normalizeAppPassword(raw: string) {
  return raw.replace(/\s+/g, '')
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

async function withClient<T>(
  email: string,
  appPassword: string,
  fn: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: normalizeAppPassword(appPassword) },
    logger: false,
  })
  try {
    await client.connect()
    return await fn(client)
  } finally {
    try {
      await client.logout()
    } catch {
      // ignore
    }
  }
}

/** Verify credentials by opening INBOX. */
export async function verifyImapLogin(email: string, appPassword: string) {
  await withClient(email, appPassword, async (client) => {
    const lock = await client.getMailboxLock('INBOX')
    lock.release()
  })
}

export async function saveImapConnection(userId: string, email: string, appPassword: string) {
  await verifyImapLogin(email, appPassword)
  const conn: EmailConnection = {
    userId,
    provider: 'gmail_imap',
    email: email.trim().toLowerCase(),
    accessToken: 'imap',
    refreshToken: encryptSecret(normalizeAppPassword(appPassword)),
    expiryDate: null,
    updatedAt: new Date().toISOString(),
  }
  await saveConnection(conn)
  return conn
}

export async function listOvernightViaImap(
  userId: string,
  opts?: { timeZone?: string | null; max?: number },
): Promise<GmailMessagePreview[]> {
  const conn = await getConnection(userId)
  if (!conn || conn.provider !== 'gmail_imap') {
    throw new Error('Gmail IMAP not connected')
  }
  const appPassword = decryptSecret(conn.refreshToken)
  const window = previousLocalDayWindow(opts?.timeZone)
  const max = opts?.max ?? 40

  return withClient(conn.email, appPassword, async (client) => {
    const lock = await client.getMailboxLock('INBOX')
    try {
      // IMAP SINCE is date-only; refine with local-day window client-side
      const uids = await client.search({ since: window.start }, { uid: true })
      const ids = (uids || []).slice(-max).reverse()
      const previews: GmailMessagePreview[] = []

      for (const uid of ids) {
        const msg = await client.fetchOne(
          uid,
          { envelope: true, source: false, flags: true },
          { uid: true },
        )
        if (!msg || !msg.envelope) continue
        const date = msg.envelope.date ? new Date(msg.envelope.date) : null
        if (!date || Number.isNaN(date.getTime()) || !isInWindow(date, window)) continue

        const fromObj = msg.envelope.from?.[0]
        const fromEmail = fromObj?.address || 'unknown'
        const fromName = fromObj?.name || fromEmail.split('@')[0]
        const subject = msg.envelope.subject || '(no subject)'
        const flags = msg.flags || new Set()
        previews.push({
          id: String(uid),
          from: fromEmail,
          fromName,
          subject,
          snippet: '',
          date: date.toISOString(),
          unread: !flags.has('\\Seen'),
        })
        if (previews.length >= max) break
      }

      return previews
    } finally {
      lock.release()
    }
  })
}

export { parseFrom, normalizeAppPassword }
