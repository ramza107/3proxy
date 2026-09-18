import Constants from 'expo-constants'
import type { EmailDigest } from '../types'
import { apiUrl } from './api'

const extra = Constants.expoConfig?.extra ?? {}

export function emailConnectUrl(userId: string) {
  return `${apiUrl}/api/email/connect?user_id=${encodeURIComponent(userId)}`
}

export async function fetchEmailStatus(userId: string): Promise<{
  configured: boolean
  connected: boolean
  email: string | null
  provider: string | null
}> {
  const res = await fetch(`${apiUrl}/api/email/status?user_id=${encodeURIComponent(userId)}`)
  if (!res.ok) {
    return { configured: false, connected: false, email: null, provider: null }
  }
  return res.json()
}

export async function fetchEmailDigest(
  userId: string,
  opts?: { demo?: boolean },
): Promise<EmailDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.demo) q.set('demo', '1')
  const res = await fetch(`${apiUrl}/api/email/digest?${q.toString()}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Digest failed (${res.status})`)
  }
  return res.json()
}

export async function disconnectEmail(userId: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/email/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Disconnect failed (${res.status})`)
  }
}

export async function connectGmailImap(params: {
  userId: string
  email: string
  appPassword: string
}): Promise<{ ok: boolean; email: string; provider: string }> {
  const res = await fetch(`${apiUrl}/api/email/connect-imap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: params.userId,
      email: params.email,
      app_password: params.appPassword,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      (json as { hint?: string; error?: string }).hint ||
        (json as { error?: string }).error ||
        `Connect failed (${res.status})`,
    )
  }
  return json as { ok: boolean; email: string; provider: string }
}

/** Public site URL used after OAuth (for docs / redirects). */
export const publicAppUrl =
  (extra.publicAppUrl as string) ||
  process.env.EXPO_PUBLIC_APP_URL ||
  'https://ramza107.github.io/3proxy/nova/'
