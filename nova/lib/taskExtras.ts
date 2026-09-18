import type { ChecklistItem, Task, TaskRecurrence } from '../types'

function chkId(prefix = 'chk') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (typeof item === 'string') {
        const text = item.trim()
        if (!text) return null
        return { id: chkId(), text, done: false } as ChecklistItem
      }
      if (item && typeof item === 'object') {
        const row = item as Partial<ChecklistItem>
        const text = String(row.text || '').trim()
        if (!text) return null
        return {
          id: row.id || chkId(`chk${index}`),
          text,
          done: Boolean(row.done),
        } as ChecklistItem
      }
      return null
    })
    .filter(Boolean) as ChecklistItem[]
}

export function checklistFromStrings(items: string[] | null | undefined): ChecklistItem[] {
  if (!items?.length) return []
  return items
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .map((text) => ({ id: chkId(), text, done: false }))
}

export function normalizeRecurrence(raw: unknown): TaskRecurrence | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<TaskRecurrence>
  if (row.type !== 'monthly') return null
  const day = Number(row.dayOfMonth)
  if (!Number.isFinite(day) || day < 1 || day > 31) return null
  return { type: 'monthly', dayOfMonth: Math.floor(day) }
}

/** Clamp day-of-month into a given year/month (0-based month). */
export function clampDayOfMonth(year: number, monthIndex: number, day: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(Math.max(1, day), last)
}

export function dateOnDayOfMonth(year: number, monthIndex: number, dayOfMonth: number) {
  const day = clampDayOfMonth(year, monthIndex, dayOfMonth)
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Next occurrence on/after `fromISO` (YYYY-MM-DD), or today if omitted. */
export function nextMonthlyDate(dayOfMonth: number, fromISO?: string | null) {
  const base = fromISO ? new Date(`${fromISO}T12:00:00`) : new Date()
  if (Number.isNaN(base.getTime())) {
    const now = new Date()
    return dateOnDayOfMonth(now.getFullYear(), now.getMonth(), dayOfMonth)
  }
  const y = base.getFullYear()
  const m = base.getMonth()
  const candidate = dateOnDayOfMonth(y, m, dayOfMonth)
  if (candidate >= base.toISOString().slice(0, 10)) return candidate
  const nextMonth = m === 11 ? 0 : m + 1
  const nextYear = m === 11 ? y + 1 : y
  return dateOnDayOfMonth(nextYear, nextMonth, dayOfMonth)
}

/** After completing a monthly task: same day next month. */
export function advanceMonthlyDate(dayOfMonth: number, currentDate: string | null) {
  const base = currentDate ? new Date(`${currentDate}T12:00:00`) : new Date()
  const y = base.getFullYear()
  const m = base.getMonth()
  const nextMonth = m === 11 ? 0 : m + 1
  const nextYear = m === 11 ? y + 1 : y
  return dateOnDayOfMonth(nextYear, nextMonth, dayOfMonth)
}

export function resetChecklist(items: ChecklistItem[]): ChecklistItem[] {
  return (items || []).map((i) => ({ ...i, done: false }))
}

export function normalizeTask(task: Task): Task {
  return {
    ...task,
    checklist: normalizeChecklist(task.checklist),
    recurrence: normalizeRecurrence(task.recurrence),
  }
}

export function recurrenceLabel(recurrence: TaskRecurrence | null | undefined) {
  if (!recurrence || recurrence.type !== 'monthly') return null
  const d = recurrence.dayOfMonth
  const suffix =
    d % 10 === 1 && d !== 11
      ? 'st'
      : d % 10 === 2 && d !== 12
        ? 'nd'
        : d % 10 === 3 && d !== 13
          ? 'rd'
          : 'th'
  return `Every month on the ${d}${suffix}`
}

export function checklistProgress(items: ChecklistItem[] | null | undefined) {
  const list = items || []
  if (!list.length) return null
  const done = list.filter((i) => i.done).length
  return { done, total: list.length }
}
