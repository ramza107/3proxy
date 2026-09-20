import { withFreshToken } from './gmail.js'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location: string | null
  calendar: string
}

type GoogleEvent = {
  id?: string
  summary?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

/**
 * List primary calendar events between from/to (ISO strings).
 * Requires calendar.readonly on the Google token (reconnect if only Gmail was granted).
 */
export async function listCalendarEvents(
  userId: string,
  opts: { from: string; to: string },
): Promise<{ email: string; events: CalendarEvent[] }> {
  const conn = await withFreshToken(userId)
  const q = new URLSearchParams({
    timeMin: opts.from,
    timeMax: opts.to,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${q.toString()}`, {
    headers: { Authorization: `Bearer ${conn.accessToken}` },
  })
  if (res.status === 403) {
    throw new Error('Calendar permission missing — reconnect Google in Settings')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text.slice(0, 200) || `Calendar failed (${res.status})`)
  }
  const data = (await res.json()) as { items?: GoogleEvent[] }
  const events: CalendarEvent[] = (data.items || [])
    .map((item) => {
      const start = item.start?.dateTime || item.start?.date || ''
      const end = item.end?.dateTime || item.end?.date || start
      if (!start) return null
      return {
        id: item.id || `${start}-${item.summary || 'event'}`,
        title: item.summary || '(No title)',
        start,
        end,
        allDay: Boolean(item.start?.date && !item.start?.dateTime),
        location: item.location || null,
        calendar: 'primary',
      }
    })
    .filter(Boolean) as CalendarEvent[]

  return { email: conn.email, events }
}

/** Demo events for UI when not connected. */
export function demoCalendarEvents(dayISO: string): CalendarEvent[] {
  return [
    {
      id: 'demo-standup',
      title: 'Team standup',
      start: `${dayISO}T10:00:00`,
      end: `${dayISO}T10:30:00`,
      allDay: false,
      location: null,
      calendar: 'demo',
    },
    {
      id: 'demo-lunch',
      title: 'Lunch with Alex',
      start: `${dayISO}T13:00:00`,
      end: `${dayISO}T14:00:00`,
      allDay: false,
      location: 'Cafe',
      calendar: 'demo',
    },
  ]
}
