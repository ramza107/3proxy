import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { EmailDigest } from '../types'
import { apiUrl } from './api'

const extra = Constants.expoConfig?.extra ?? {}

export function emailConnectUrl(userId: string) {
  const client = Platform.OS === 'web' ? 'web' : 'native'
  return `${apiUrl}/api/email/connect?user_id=${encodeURIComponent(userId)}&client=${client}`
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
  opts?: { demo?: boolean; timeZone?: string },
): Promise<EmailDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.demo) q.set('demo', '1')
  const tz =
    opts?.timeZone ||
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined)
  if (tz) q.set('timezone', tz)
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

export async function fetchEmailPromises(
  userId: string,
  opts?: { demo?: boolean; days?: number },
): Promise<import('../types').PromisesDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.demo) q.set('demo', '1')
  if (opts?.days) q.set('days', String(opts.days))
  const res = await fetch(`${apiUrl}/api/email/promises?${q.toString()}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Promises failed (${res.status})`)
  }
  return res.json()
}

export async function fetchEmailMeetings(
  userId: string,
  opts?: { demo?: boolean; hours?: number },
): Promise<import('../types').MeetingsDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.demo) q.set('demo', '1')
  if (opts?.hours) q.set('hours', String(opts.hours))
  const res = await fetch(`${apiUrl}/api/email/meetings?${q.toString()}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Meetings failed (${res.status})`)
  }
  return res.json()
}

export async function registerPushToken(userId: string, token: string): Promise<void> {
  await fetch(`${apiUrl}/api/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, token }),
  })
}

/** Public site URL used after OAuth (for docs / redirects). */
export const publicAppUrl =
  (extra.publicAppUrl as string) ||
  process.env.EXPO_PUBLIC_APP_URL ||
  'https://ramza107.github.io/3proxy/nova/'
