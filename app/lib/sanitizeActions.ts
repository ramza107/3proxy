import type { AIAction, Bill, Priority, Task, TaskRecurrence } from '../types'

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

function isISODate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function isTime(v: unknown): v is string {
  return typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v)
}

function normalizeTime(t: string): string | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function parseRecurrence(raw: unknown): TaskRecurrence | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { freq?: string; days?: unknown }
  if (r.freq === 'daily') return { freq: 'daily' }
  if (r.freq === 'weekly') {
    const days = Array.isArray(r.days)
      ? r.days.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6)
      : []
    return { freq: 'weekly', days: days.length ? (days as TaskRecurrence['days']) : [1] }
  }
  return null
}

/** Client-side guard for localAI / any unvalidated API payload. */
export function sanitizeAIActions(raw: unknown, tasks: Task[], bills: Bill[] = []): AIAction[] {
  if (!Array.isArray(raw)) return []
  const taskIds = new Set(tasks.map((t) => t.id))
  const billIds = new Set(bills.map((b) => b.id))
  const out: AIAction[] = []

  for (const item of raw.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const type = a.type

    if (type === 'create_task') {
      if (typeof a.title !== 'string' || !a.title.trim()) continue
      const time = a.time == null ? null : isTime(a.time) ? normalizeTime(a.time) : null
      if (a.time != null && !time) continue
      const priority = PRIORITIES.includes(a.priority as Priority)
        ? (a.priority as Priority)
        : 'medium'
      out.push({
        type: 'create_task',
        title: a.title.trim().slice(0, 200),
        date: a.date == null ? null : isISODate(a.date) ? a.date : null,
        time,
        priority,
        recurrence: parseRecurrence(a.recurrence),
      })
      continue
    }

    if (type === 'update_task') {
      if (typeof a.task_id !== 'string' || !taskIds.has(a.task_id)) continue
      const patch: Extract<AIAction, { type: 'update_task' }> = {
        type: 'update_task',
        task_id: a.task_id,
      }
      if (typeof a.title === 'string' && a.title.trim()) patch.title = a.title.trim().slice(0, 200)
      if (a.date === null || isISODate(a.date)) patch.date = (a.date as string | null) ?? null
      if (a.time === null) patch.time = null
      else if (isTime(a.time)) {
        const t = normalizeTime(a.time)
        if (!t) continue
        patch.time = t
      }
      if (PRIORITIES.includes(a.priority as Priority)) patch.priority = a.priority as Priority
      out.push(patch)
      continue
    }

    if (type === 'complete_task' || type === 'delete_task') {
      if (typeof a.task_id !== 'string' || !taskIds.has(a.task_id)) continue
      out.push({ type, task_id: a.task_id })
      continue
    }

    if (type === 'create_reminder') {
      if (typeof a.title !== 'string' || !a.title.trim()) continue
      if (!isISODate(a.date) || !isTime(a.time)) continue
      const time = normalizeTime(a.time)
      if (!time) continue
      out.push({
        type: 'create_reminder',
        title: a.title.trim().slice(0, 200),
        date: a.date,
        time,
        ...(typeof a.task_id === 'string' ? { task_id: a.task_id } : {}),
      })
      continue
    }

    if (type === 'create_bill') {
      if (typeof a.title !== 'string' || !a.title.trim()) continue
      const day = Number(a.dayOfMonth)
      if (!Number.isFinite(day) || day < 1 || day > 28) continue
      out.push({
        type: 'create_bill',
        title: a.title.trim().slice(0, 80),
        amount: Math.max(0, Number(a.amount) || 0),
        currency: typeof a.currency === 'string' ? a.currency : 'UAH',
        dayOfMonth: Math.round(day),
        category: typeof a.category === 'string' ? a.category : 'General',
        payHowTo: typeof a.payHowTo === 'string' ? a.payHowTo : null,
      })
      continue
    }

    if (type === 'mark_bill_paid') {
      const bill_id =
        typeof a.bill_id === 'string' && billIds.has(a.bill_id) ? a.bill_id : null
      const title_hint = typeof a.title_hint === 'string' ? a.title_hint : null
      if (!bill_id && !(title_hint || '').trim()) continue
      out.push({
        type: 'mark_bill_paid',
        bill_id,
        title_hint,
        month:
          typeof a.month === 'string' && /^\d{4}-\d{2}$/.test(a.month) ? a.month : null,
      })
      continue
    }

    if (type === 'create_calendar_event') {
      if (typeof a.title !== 'string' || !a.title.trim()) continue
      if (!isISODate(a.date) || !isTime(a.time)) continue
      const time = normalizeTime(a.time)
      if (!time) continue
      const durationMin = Number(a.durationMin)
      out.push({
        type: 'create_calendar_event',
        title: a.title.trim().slice(0, 200),
        date: a.date,
        time,
        durationMin:
          Number.isFinite(durationMin) && durationMin >= 5 && durationMin <= 480
            ? Math.round(durationMin)
            : 60,
        location: typeof a.location === 'string' ? a.location : null,
      })
    }
  }

  return out
}

export function isDestructiveAction(a: AIAction): boolean {
  return a.type === 'complete_task' || a.type === 'delete_task'
}
