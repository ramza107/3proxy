import type { AIAction, Priority, Task, UserSettings } from '../types'

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

/**
 * Pack untimed tasks for `day` into free gaps between workdayStart–workdayEnd,
 * around tasks that already have a time. Returns update_task actions.
 */
export function planDayActions(params: {
  tasks: Task[]
  day: string
  settings: Pick<UserSettings, 'workdayStart' | 'workdayEnd'>
  /** Also pull undated open tasks into today */
  includeUndated?: boolean
}): { actions: Extract<AIAction, { type: 'update_task' }>[]; summary: string; placed: number } {
  const start =
    parseHmToMinutes(params.settings.workdayStart || '09:00') ?? 9 * 60
  const end =
    parseHmToMinutes(params.settings.workdayEnd || '18:00') ?? 18 * 60
  if (end <= start + 30) {
    return {
      actions: [],
      summary: 'Work hours look invalid — set Workday in Settings.',
      placed: 0,
    }
  }

  const open = params.tasks.filter((t) => !t.completed)
  const dayTasks = open.filter((t) => t.date === params.day)
  const undated = params.includeUndated
    ? open.filter((t) => !t.date)
    : []

  const timed = dayTasks.filter((t) => t.time && parseHmToMinutes(t.time) != null)
  const untimed = [
    ...dayTasks.filter((t) => !t.time),
    ...undated,
  ].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))

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

  const actions: Extract<AIAction, { type: 'update_task' }>[] = []
  let cursor = start

  for (const task of untimed) {
    const dur = durationForPriority(task.priority)
    let placedAt: number | null = null

    // advance cursor past busy blocks
    while (placedAt == null) {
      // skip overlapping busy
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

  let summary = actions.length
    ? `Planned ${actions.length} task${actions.length > 1 ? 's' : ''} into your day (${params.settings.workdayStart}–${params.settings.workdayEnd}):\n${lines}`
    : 'No free slots left in your workday.'
  if (leftover > 0) {
    summary += `\n${leftover} left unscheduled — shorten the list or extend work hours.`
  }

  return { actions, summary, placed: actions.length }
}

/** Build hour labels for a visual timeline */
export function workdayHours(startHm: string, endHm: string): number[] {
  const s = parseHmToMinutes(startHm) ?? 9 * 60
  const e = parseHmToMinutes(endHm) ?? 18 * 60
  const hours: number[] = []
  for (let m = Math.floor(s / 60) * 60; m < e; m += 60) {
    hours.push(m / 60)
  }
  return hours
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
