/** Device-local calendar date helpers — never use UTC ISO date slices for “today”. */

export function localISODate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function localISOMonth(d = new Date()): string {
  return localISODate(d).slice(0, 7)
}

/** Add calendar days in local time (noon anchor avoids DST edge flips). */
export function addLocalDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return localISODate(d)
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Weekday label for context (EN). */
export function localWeekdayName(isoDate: string, locale = 'en'): string {
  try {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString(locale, { weekday: 'long' })
  } catch {
    return ''
  }
}
