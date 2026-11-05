import type { AIAction, Dow, Priority, Task, TypicalWeek, UserSettings, WeekAnchor } from '../types'
import { defaultTypicalWeek } from '../types'

export function parseHmToMinutes(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

export function minutesToHm(total: number): string {
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Slot length by priority — high gets more focus time. */
export function durationForPriority(priority: Priority): number {
  if (priority === 'high') return 60
  if (priority === 'medium') return 45
  return 30
}

type BusyBlock = { start: number; end: number; taskId: string; title: string }

function priorityRank(p: Priority) {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2
}

export function dowFromISO(day: string): Dow {
  const d = new Date(`${day}T12:00:00`)
  return d.getDay() as Dow
}

export function normalizeTypicalWeek(raw?: Partial<TypicalWeek> | null): TypicalWeek {
  const base = defaultTypicalWeek()
  if (!raw) return base
  const workDays = Array.isArray(raw.workDays) && raw.workDays.length === 7
    ? (raw.workDays.map(Boolean) as TypicalWeek['workDays'])
    : base.workDays
  const anchors = Array.isArray(raw.anchors)
    ? raw.anchors
        .filter((a) => a && a.title && a.time && Array.isArray(a.days))
        .map((a) => ({
          id: String(a.id || `a_${Math.random().toString(36).slice(2, 8)}`),
          title: String(a.title).slice(0, 40),
          days: a.days.filter((d): d is Dow => typeof d === 'number' && d >= 0 && d <= 6),
          time: String(a.time),
          durationMin: Math.min(180, Math.max(15, Number(a.durationMin) || 60)),
        }))
    : []
  return {
    workDays,
    weekendStart: raw.weekendStart || base.weekendStart,
    weekendEnd: raw.weekendEnd || base.weekendEnd,
    anchors,
    blurb: typeof raw.blurb === 'string' ? raw.blurb.slice(0, 240) : '',
  }
}

/** Resolve today's packing window from typical week + workday defaults. */
export function resolveDayWindow(
  settings: Pick<UserSettings, 'workdayStart' | 'workdayEnd' | 'typicalWeek'>,
  day: string,
): { start: string; end: string; kind: 'work' | 'light'; dow: Dow } {
  const tw = normalizeTypicalWeek(settings.typicalWeek)
  const dow = dowFromISO(day)
  if (tw.workDays[dow]) {
    return {
      start: settings.workdayStart || '09:00',
      end: settings.workdayEnd || '18:00',
      kind: 'work',
      dow,
    }
  }
  return {
    start: tw.weekendStart || '10:00',
    end: tw.weekendEnd || '14:00',
    kind: 'light',
    dow,
  }
}

export function anchorsForDay(tw: TypicalWeek, day: string): WeekAnchor[] {
  const dow = dowFromISO(day)
  return normalizeTypicalWeek(tw).anchors.filter((a) => a.days.includes(dow))
}

/**
 * Pack untimed tasks for `day` into free gaps for that weekday's rhythm,
 * around timed tasks + recurring anchors. Returns update_task actions.
 */
export function planDayActions(params: {
  tasks: Task[]
  day: string
  settings: Pick<UserSettings, 'workdayStart' | 'workdayEnd' | 'typicalWeek'>
  /** Also pull undated open tasks into today */
  includeUndated?: boolean
  /** Skip these task ids (Plan day “protect”) */
  skipTaskIds?: string[]
  /** Existing Google Calendar blocks (minutes from midnight) */
  calendarBusy?: { start: number; end: number; title: string }[]
}): { actions: Extract<AIAction, { type: 'update_task' }>[]; summary: string; placed: number } {
  const window = resolveDayWindow(params.settings, params.day)
  const start = parseHmToMinutes(window.start) ?? 9 * 60
  const end = parseHmToMinutes(window.end) ?? 18 * 60
  if (end <= start + 30) {
    return {
      actions: [],
      summary: 'Work hours look invalid — set Workday / Typical week in Settings.',
      placed: 0,
    }
  }

  const skip = new Set(params.skipTaskIds || [])
  const open = params.tasks.filter((t) => !t.completed && !skip.has(t.id))
  const dayTasks = open.filter((t) => t.date === params.day)
  const undated = params.includeUndated ? open.filter((t) => !t.date) : []

  const timed = dayTasks.filter((t) => t.time && parseHmToMinutes(t.time) != null)
  const untimed = [...dayTasks.filter((t) => !t.time), ...undated].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
  )

  // Prefer high-priority earlier on work mornings
  if (window.kind === 'work') {
    untimed.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
  }

  if (!untimed.length) {
    return {
      actions: [],
      summary: timed.length
        ? 'Everything for today already has a time.'
        : 'No open tasks to place — add something first.',
      placed: 0,
    }
  }

  const busy: BusyBlock[] = timed
    .map((t) => {
      const s = parseHmToMinutes(t.time!)!
      const dur = durationForPriority(t.priority)
      return { start: s, end: s + dur, taskId: t.id, title: t.title }
    })
    .sort((a, b) => a.start - b.start)

  const tw = normalizeTypicalWeek(params.settings.typicalWeek)
  for (const a of anchorsForDay(tw, params.day)) {
    const s = parseHmToMinutes(a.time)
    if (s == null) continue
    busy.push({
      start: s,
      end: s + a.durationMin,
      taskId: `anchor:${a.id}`,
      title: a.title,
    })
  }
  for (const c of params.calendarBusy || []) {
    if (!Number.isFinite(c.start) || !Number.isFinite(c.end) || c.end <= c.start) continue
    busy.push({
      start: c.start,
      end: c.end,
      taskId: `cal:${c.start}-${c.end}`,
      title: c.title || 'Calendar',
    })
  }
  busy.sort((a, b) => a.start - b.start)

  const actions: Extract<AIAction, { type: 'update_task' }>[] = []
  let cursor = start

  for (const task of untimed) {
    const dur = durationForPriority(task.priority)
    let placedAt: number | null = null

    while (placedAt == null) {
      let blocked = false
      for (const b of busy) {
        if (cursor < b.end && cursor + dur > b.start) {
          cursor = Math.max(cursor, b.end)
          blocked = true
          break
        }
      }
      if (blocked) continue
      if (cursor + dur > end) break
      placedAt = cursor
    }

    if (placedAt == null) break

    actions.push({
      type: 'update_task',
      task_id: task.id,
      date: params.day,
      time: minutesToHm(placedAt),
    })
    busy.push({
      start: placedAt,
      end: placedAt + dur,
      taskId: task.id,
      title: task.title,
    })
    busy.sort((a, b) => a.start - b.start)
    cursor = placedAt + dur
  }

  const leftover = untimed.length - actions.length
  const lines = actions
    .slice(0, 6)
    .map((a) => {
      const t = untimed.find((x) => x.id === a.task_id)
      return `· ${a.time} — ${t?.title || 'task'}`
    })
    .join('\n')

  const kindLabel = window.kind === 'work' ? 'workday' : 'light day'
  const anchorNote = anchorsForDay(tw, params.day)
    .map((a) => `${a.title} ${a.time}`)
    .join(', ')

  let summary = actions.length
    ? `Planned ${actions.length} task${actions.length > 1 ? 's' : ''} into your ${kindLabel} (${window.start}–${window.end}):\n${lines}`
    : `No free slots left in your ${kindLabel} (${window.start}–${window.end}).`
  if (anchorNote) summary += `\nKept anchors: ${anchorNote}.`
  if (leftover > 0) {
    summary += `\n${leftover} left unscheduled — shorten the list or extend hours in Typical week.`
  }

  return { actions, summary, placed: actions.length }
}

export function isOrganizeDayIntent(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (!t) return false
  if (
    /(разлож|спланиру|организуй|расписан|составь\s+план|план\s+на\s+день|разбери\s+день).{0,30}(день|сегодня|задач)?/i.test(
      t,
    )
  ) {
    return true
  }
  if (
    /\b(organize|plan|schedule|pack|arrange)\b.{0,40}\b(my\s+)?(day|today|schedule|tasks)\b/i.test(
      t,
    )
  ) {
    return true
  }
  if (/^(plan my day|organize my day|schedule my day|разложи день|спланируй день)\b/i.test(t)) {
    return true
  }
  return false
}

export const DOW_LABELS: { key: Dow; short: string }[] = [
  { key: 1, short: 'Mon' },
  { key: 2, short: 'Tue' },
  { key: 3, short: 'Wed' },
  { key: 4, short: 'Thu' },
  { key: 5, short: 'Fri' },
  { key: 6, short: 'Sat' },
  { key: 0, short: 'Sun' },
]
