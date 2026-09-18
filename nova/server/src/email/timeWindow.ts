/** Calendar-day helpers in an IANA time zone (e.g. Europe/Moscow, America/New_York). */

export type DayWindow = {
  /** YYYY-MM-DD of the previous local calendar day */
  day: string
  timeZone: string
  /** Inclusive start (UTC instant) */
  start: Date
  /** Exclusive end (UTC instant) = start of "today" in that TZ */
  end: Date
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function resolveTimeZone(raw?: string | null): string {
  const tz = (raw || '').trim()
  if (!tz) return 'UTC'
  try {
    // Throws RangeError for invalid IANA zones
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return tz
  } catch {
    return 'UTC'
  }
}

export function formatYmdInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function tzParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** UTC instant when local calendar date `ymd` is 00:00:00 in `timeZone`. */
export function localMidnightToUtc(ymd: string, timeZone: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  let t = Date.UTC(y, m - 1, d, 0, 0, 0)
  for (let i = 0; i < 5; i++) {
    const p = tzParts(new Date(t), timeZone)
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    const desired = Date.UTC(y, m - 1, d, 0, 0, 0)
    const delta = desired - asUtc
    if (delta === 0) break
    t += delta
  }
  return new Date(t)
}

export function addCalendarDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + delta))
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Previous full local calendar day [start, end) in the given time zone. */
export function previousLocalDayWindow(timeZoneInput?: string | null, now = new Date()): DayWindow {
  const timeZone = resolveTimeZone(timeZoneInput)
  const today = formatYmdInZone(now, timeZone)
  const day = addCalendarDays(today, -1)
  const start = localMidnightToUtc(day, timeZone)
  const end = localMidnightToUtc(today, timeZone)
  return { day, timeZone, start, end }
}

export function formatLocalTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function formatLocalDayLabel(ymd: string, timeZone: string): string {
  const noon = localMidnightToUtc(ymd, timeZone)
  noon.setUTCHours(noon.getUTCHours() + 12)
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(noon)
}

export function isInWindow(date: Date, window: DayWindow): boolean {
  const t = date.getTime()
  return t >= window.start.getTime() && t < window.end.getTime()
}
