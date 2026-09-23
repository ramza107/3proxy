import { Platform } from 'react-native'
import { findNextBill, formatBillDueLabel, formatMoney } from './bills'
import {
  findNearestTask,
  formatNearestTaskTime,
  nearestTaskLabel,
} from './nearestTask'
import { localISODate } from './localDate'
import { tasksForDay, useNovaStore } from './store'

/** Payload pushed into the iOS WahrlyToday widget. */
export type WidgetSnapshot = {
  /** Small eyebrow: NEXT / TOMORROW / UPCOMING / WAHRLY */
  label: string
  /** Clock "14:00", short date, or empty */
  time: string
  /** Task title or empty-state line */
  title: string
  /** e.g. "2 more today" */
  subtitle: string
  updatedAt: string
  // Kept for older widget binaries mid-update (harmless extras)
  greeting?: string
  todayCount?: number
  nextTask?: string
  nextBill?: string
}

function nextBillLine(): string {
  const bill = findNextBill(useNovaStore.getState().bills)
  if (!bill) return ''
  const when = formatBillDueLabel(bill)
  const whenLabel =
    when === 'today' ? 'today' : when === 'tomorrow' ? 'tomorrow' : when === 'overdue' ? 'overdue' : when
  return `${bill.title} · ${formatMoney(bill.amount, bill.currency)} · ${whenLabel}`
}

function buildSnapshot(): WidgetSnapshot {
  const store = useNovaStore.getState()
  const today = localISODate()
  const openToday = tasksForDay(store.tasks, today)
  const nearest = findNearestTask(store.tasks)
  const moreToday = Math.max(0, openToday.length - (nearest?.date === today ? 1 : 0))
  const nextBill = nextBillLine()

  if (!nearest) {
    return {
      label: 'WAHRLY',
      time: '',
      title: nextBill ? nextBill.split(' · ')[0] : 'No upcoming tasks',
      subtitle: nextBill || 'Ask Wahrly to add one',
      updatedAt: new Date().toISOString(),
      greeting: 'Wahrly',
      todayCount: 0,
      nextTask: 'No upcoming tasks',
      nextBill,
    }
  }

  const time = formatNearestTaskTime(nearest)
  const label = nearestTaskLabel(nearest, today)
  const subtitle =
    nearest.date === today
      ? moreToday > 0
        ? `${moreToday} more today`
        : openToday.length <= 1
          ? nextBill || 'Today'
          : nextBill || ''
      : nearest.date
        ? nearest.date
        : 'No date'

  return {
    label,
    time,
    title: nearest.title,
    subtitle: nextBill && !subtitle.includes(billTitleHint(nextBill)) ? joinSub(subtitle, nextBill) : subtitle,
    updatedAt: new Date().toISOString(),
    greeting: label,
    todayCount: openToday.length,
    nextTask: time ? `${time} · ${nearest.title}` : nearest.title,
    nextBill,
  }
}

function billTitleHint(line: string) {
  return line.split(' · ')[0] || ''
}

function joinSub(a: string, b: string) {
  if (!a) return b
  if (!b) return a
  return `${a} · ${b}`
}

/** Push nearest task into the iOS home/lock widget (no-op on web/Android). */
export async function refreshWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== 'ios') return
  try {
    const { default: WahrlyToday } = await import('../widgets/WahrlyToday')
    WahrlyToday.updateSnapshot(buildSnapshot())
  } catch {
    // Widget native module only exists in a customized EAS binary
  }
}
