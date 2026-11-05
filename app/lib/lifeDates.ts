import type { ImportantDate, LifeAdminItem } from '../types'
import { localISODate } from './localDate'

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

/** Next yearly occurrence of month/day on or after `from` (local). */
export function nextYearlyOccurrence(
  month: number,
  day: number,
  from = new Date(),
): Date {
  const y = from.getFullYear()
  const clampedDay = Math.min(Math.max(1, day), daysInMonth(y, month))
  let next = new Date(y, month - 1, clampedDay, 0, 0, 0, 0)
  if (next.getTime() < startOfLocalDay(from).getTime()) {
    const y2 = y + 1
    const d2 = Math.min(Math.max(1, day), daysInMonth(y2, month))
    next = new Date(y2, month - 1, d2, 0, 0, 0, 0)
  }
  return next
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function importantDateNext(d: ImportantDate, from = new Date()): Date {
  return nextYearlyOccurrence(d.month, d.day, from)
}

export function importantDateNextISO(d: ImportantDate, from = new Date()): string {
  return localISODate(importantDateNext(d, from))
}

/** Days until next occurrence (0 = today). */
export function daysUntilImportantDate(d: ImportantDate, from = new Date()): number {
  const next = importantDateNext(d, from)
  return Math.round(
    (startOfLocalDay(next).getTime() - startOfLocalDay(from).getTime()) / 86400000,
  )
}

export function sortImportantDates(dates: ImportantDate[], from = new Date()) {
  return [...dates].sort((a, b) => {
    const da = importantDateNext(a, from).getTime()
    const db = importantDateNext(b, from).getTime()
    if (da !== db) return da - db
    return a.title.localeCompare(b.title)
  })
}

export function parseExpiresOn(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

export function daysUntilExpiry(item: LifeAdminItem, from = new Date()): number | null {
  const exp = parseExpiresOn(item.expiresOn)
  if (!exp) return null
  return Math.round(
    (startOfLocalDay(exp).getTime() - startOfLocalDay(from).getTime()) / 86400000,
  )
}

export function sortLifeAdmin(items: LifeAdminItem[], from = new Date()) {
  return [...items].sort((a, b) => {
    const da = daysUntilExpiry(a, from)
    const db = daysUntilExpiry(b, from)
    if (da == null && db == null) return a.title.localeCompare(b.title)
    if (da == null) return 1
    if (db == null) return -1
    if (da !== db) return da - db
    return a.title.localeCompare(b.title)
  })
}

/** Parse MM-DD or YYYY-MM-DD or free day/month into parts. */
export function parseMonthDay(
  raw: string,
): { month: number; day: number; year: number | null } | null {
  const s = raw.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return { month, day, year }
  }
  m = s.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = m[3] ? Number(m[3]) : null
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return { month, day, year }
  }
  m = s.match(/^(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const month = Number(m[1])
    const day = Number(m[2])
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return { month, day, year: null }
  }
  return null
}

export function formatMonthDay(month: number, day: number, year?: number | null) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  if (year) return `${year}-${mm}-${dd}`
  return `${mm}-${dd}`
}
