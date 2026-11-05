/** Next occurrence helpers for recurring tasks. */

import { addDays, format, parseISO } from 'date-fns'
import type { Locale } from 'date-fns'
import type { Dow, TaskRecurrence } from '../types'

/** First date on/after fromISO that matches the recurrence (for new recurring tasks). */
export function firstOccurrenceDate(fromISO: string, rec: TaskRecurrence): string {
  let from: Date
  try {
    from = parseISO(fromISO)
  } catch {
    from = new Date()
  }
  if (Number.isNaN(from.getTime())) from = new Date()

  if (rec.freq === 'daily') return format(from, 'yyyy-MM-dd')

  const days = (rec.days?.length ? rec.days : [from.getDay() as Dow]).slice().sort()
  if (days.includes(from.getDay() as Dow)) return format(from, 'yyyy-MM-dd')
  return nextOccurrenceDate(fromISO, rec)
}

export function nextOccurrenceDate(fromISO: string, rec: TaskRecurrence): string {
  let from: Date
  try {
    from = parseISO(fromISO)
  } catch {
    from = new Date()
  }
  if (Number.isNaN(from.getTime())) from = new Date()

  if (rec.freq === 'daily') {
    return format(addDays(from, 1), 'yyyy-MM-dd')
  }

  const days = (rec.days?.length ? rec.days : [from.getDay() as Dow]).slice().sort()
  for (let i = 1; i <= 7; i++) {
    const d = addDays(from, i)
    if (days.includes(d.getDay() as Dow)) {
      return format(d, 'yyyy-MM-dd')
    }
  }
  return format(addDays(from, 7), 'yyyy-MM-dd')
}

export function recurrenceLabel(
  rec: TaskRecurrence | null | undefined,
  opts?: { locale?: Locale; daily?: string; weekly?: string },
): string | null {
  if (!rec) return null
  const daily = opts?.daily || 'Daily'
  const weekly = opts?.weekly || 'Weekly'
  if (rec.freq === 'daily') return daily
  const days = (rec.days || []).slice().sort()
  if (!days.length) return weekly
  if (days.length === 7) return daily
  const names = days.map((dow) => {
    // Anchor on a known Sunday so getDay() === Dow index
    const d = new Date(2024, 0, 7 + dow, 12)
    return format(d, 'EEE', opts?.locale ? { locale: opts.locale } : undefined)
  })
  return `${weekly} · ${names.join(' ')}`
}
