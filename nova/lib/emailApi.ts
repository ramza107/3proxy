import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { EmailDigest } from '../types'
import { apiUrl } from './api'

const extra = Constants.expoConfig?.extra ?? {}

/** Never dump HTML / raw Express / Google quota JSON into the UI. */
export function friendlyApiError(raw: string, fallback: string): string {
  const text = (raw || '').trim()
  if (!text) return fallback
  if (/^\s*</.test(text) || /Cannot GET|Cannot POST|<html/i.test(text)) {
    return fallback
  }
  if (/Quota exceeded|Total Query Cost|rateLimitExceeded|userRateLimitExceeded|Gmail is busy/i.test(text)) {
    return 'Gmail is busy — try again in a minute'
  }
  try {
    const j = JSON.parse(text) as { error?: string; message?: string }
    const msg = j.error || j.message || ''
    if (/Quota exceeded|Total Query Cost|rateLimitExceeded|Gmail is busy/i.test(msg)) {
      return 'Gmail is busy — try again in a minute'
    }
    if (msg && msg.length <= 120 && !/^\s*\{/.test(msg)) return msg
  } catch {
    // plain text
  }
  if (text.length > 160 || /^\s*\{/.test(text)) return fallback
  return text
}

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
  opts?: { demo?: boolean; timeZone?: string; refresh?: boolean },
): Promise<EmailDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.demo) q.set('demo', '1')
  if (opts?.refresh) q.set('refresh', '1')
  const tz =
    opts?.timeZone ||
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined)
  if (tz) q.set('timezone', tz)
  const res = await fetch(`${apiUrl}/api/email/digest?${q.toString()}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Couldn’t load inbox (${res.status})`))
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

export async function fetchEmailPromises(
  userId: string,
  opts?: { demo?: boolean; days?: number; refresh?: boolean },
): Promise<import('../types').PromisesDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.demo) q.set('demo', '1')
  if (opts?.days) q.set('days', String(opts.days))
  if (opts?.refresh) q.set('refresh', '1')
  const res = await fetch(`${apiUrl}/api/email/promises?${q.toString()}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Couldn’t scan sent mail (${res.status})`))
  }
  return res.json()
}

export async function fetchEmailMeetings(
  userId: string,
  opts?: { demo?: boolean; hours?: number; refresh?: boolean },
): Promise<import('../types').MeetingsDigest> {
  const q = new URLSearchParams({ user_id: userId })
  if (opts?.demo) q.set('demo', '1')
  if (opts?.hours) q.set('hours', String(opts.hours))
  if (opts?.refresh) q.set('refresh', '1')
  const res = await fetch(`${apiUrl}/api/email/meetings?${q.toString()}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Couldn’t scan inbox asks (${res.status})`))
  }
  return res.json()
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

export async function createCalendarEvent(
  userId: string,
  params: {
    title: string
    start: string
    end: string
    allDay?: boolean
    location?: string | null
    description?: string | null
  },
): Promise<import('../types').CalendarEvent> {
  const res = await fetch(`${apiUrl}/api/calendar/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      title: params.title,
      start: params.start,
      end: params.end,
      allDay: params.allDay || false,
      location: params.location || null,
      description: params.description || null,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Couldn’t create calendar event (${res.status})`))
  }
  const data = (await res.json()) as { event: import('../types').CalendarEvent }
  return data.event
}

export async function sendEmailReply(
  userId: string,
  params: { to: string; subject: string; body: string; threadId?: string | null },
): Promise<void> {
  const res = await fetch(`${apiUrl}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      to: params.to,
      subject: params.subject,
      body: params.body,
      thread_id: params.threadId || null,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Couldn’t send email (${res.status})`))
  }
}

export async function createEmailDraft(
  userId: string,
  params: { to: string; subject: string; body: string; threadId?: string | null },
): Promise<void> {
  const res = await fetch(`${apiUrl}/api/email/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      to: params.to,
      subject: params.subject,
      body: params.body,
      thread_id: params.threadId || null,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(friendlyApiError(text, `Couldn’t create Gmail draft (${res.status})`))
  }
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
