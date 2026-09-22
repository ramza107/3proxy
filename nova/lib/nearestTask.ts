import type { Task } from '../types'
import { addLocalDays, localISODate } from './localDate'

function nowHm(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Next open task the user should care about right now. */
export function findNearestTask(tasks: Task[], now = new Date()): Task | null {
  const today = localISODate(now)
  const hm = nowHm(now)
  const open = tasks.filter((t) => !t.completed)

  const upcomingTimedToday = open
    .filter((t) => t.date === today && t.time && t.time >= hm)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  if (upcomingTimedToday[0]) return upcomingTimedToday[0]

  const restToday = open
    .filter((t) => t.date === today)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
  if (restToday[0]) return restToday[0]

  const future = open
    .filter((t) => t.date && t.date > today)
    .sort((a, b) => {
      const byDate = (a.date || '').localeCompare(b.date || '')
      if (byDate) return byDate
      return (a.time || '99:99').localeCompare(b.time || '99:99')
    })
  if (future[0]) return future[0]

  const undated = open.filter((t) => !t.date)
  return undated[0] || null
}

export function nearestTaskLabel(task: Task, today = localISODate()): string {
  if (!task.date || task.date === today) return 'NEXT'
  if (task.date === addLocalDays(today, 1)) return 'TOMORROW'
  return 'UPCOMING'
}

export function formatNearestTaskTime(task: Task): string {
  if (task.time) return task.time
  if (task.date) {
    // Show short date when there’s no clock time
    const [, m, d] = task.date.split('-')
    return `${Number(m)}/${Number(d)}`
  }
  return ''
}
