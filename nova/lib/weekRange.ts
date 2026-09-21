/** Monday–Sunday helpers for weekly brief / open loops. */

import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { Bill, Task } from '../types'
import { isPaidThisMonth, nextDueDate } from './bills'

export function weekMonday(dayISO = format(new Date(), 'yyyy-MM-dd')): string {
  const d = parseISO(`${dayISO}T12:00:00`)
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function weekSunday(dayISO = format(new Date(), 'yyyy-MM-dd')): string {
  return format(addDays(parseISO(`${weekMonday(dayISO)}T12:00:00`), 6), 'yyyy-MM-dd')
}

export function isMonday(dayISO = format(new Date(), 'yyyy-MM-dd')) {
  return parseISO(`${dayISO}T12:00:00`).getDay() === 1
}

export function unfinishedThisWeek(tasks: Task[], dayISO = format(new Date(), 'yyyy-MM-dd')) {
  const from = weekMonday(dayISO)
  const to = weekSunday(dayISO)
  return tasks.filter((t) => {
    if (t.completed) return false
    if (!t.date) return true
    return t.date >= from && t.date <= to
  })
}

export function focusTitles(tasks: Task[], limit = 3): string[] {
  const open = tasks.filter((t) => !t.completed)
  const high = open.filter((t) => t.priority === 'high')
  const rest = open.filter((t) => t.priority !== 'high')
  return [...high, ...rest].slice(0, limit).map((t) => t.title)
}

export function billsDueThisWeek(bills: Bill[], dayISO = format(new Date(), 'yyyy-MM-dd')) {
  const from = parseISO(`${weekMonday(dayISO)}T00:00:00`)
  const to = parseISO(`${weekSunday(dayISO)}T23:59:59`)
  return bills.filter((b) => {
    if (b.active === false) return false
    if (isPaidThisMonth(b)) return false
    const due = nextDueDate(b)
    return due.getTime() >= from.getTime() && due.getTime() <= to.getTime()
  })
}
