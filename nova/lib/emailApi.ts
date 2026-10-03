import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { apiUrl } from './api'

const extra = Constants.expoConfig?.extra ?? {}

/** Never dump HTML / raw Express JSON into the UI. */
export function friendlyApiError(raw: string, fallback: string): string {
  const text = (raw || '').trim()
  if (!text) return fallback
  if (/^\s*</.test(text) || /Cannot GET|Cannot POST|<html/i.test(text)) {
    return fallback
  }
  try {
    const j = JSON.parse(text) as { error?: string; message?: string }
    const msg = j.error || j.message || ''
    if (msg && msg.length <= 120 && !/^\s*\{/.test(msg)) return msg
  } catch {
    // plain text
  }
  if (text.length > 160 || /^\s*\{/.test(text)) return fallback
  return text
}

/** Google Calendar OAuth connect URL (routes still under /api/email/* for compatibility). */
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

export async function disconnectEmail(userId: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/email/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Disconnect failed (${res.status})`))
  }
}

export async function fetchCalendarEvents(
  userId: string,
  opts?: { from?: string; to?: string; demo?: boolean },
): Promise<import('../types').CalendarDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.from) q.set('from', opts.from)
  if (opts?.to) q.set('to', opts.to)
  if (opts?.demo) q.set('demo', '1')
  const res = await fetch(`${apiUrl}/api/calendar/events?${q.toString()}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Couldn’t load calendar (${res.status})`))
  }
  return res.json()
}

/** Public site URL used after OAuth (for docs / redirects). */
export const publicAppUrl =
  (extra.publicAppUrl as string) ||
  process.env.EXPO_PUBLIC_APP_URL ||
  'https://ramza107.github.io/3proxy/nova/'
