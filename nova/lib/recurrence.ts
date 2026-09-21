/** Next occurrence helpers for recurring tasks. */

import { addDays, format, parseISO } from 'date-fns'
import type { Dow, TaskRecurrence } from '../types'

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

export function recurrenceLabel(rec: TaskRecurrence | null | undefined): string | null {
  if (!rec) return null
  if (rec.freq === 'daily') return 'Daily'
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = (rec.days || []).slice().sort()
  if (!days.length) return 'Weekly'
  if (days.length === 7) return 'Daily'
  return `Weekly · ${days.map((d) => names[d]).join(' ')}`
}
