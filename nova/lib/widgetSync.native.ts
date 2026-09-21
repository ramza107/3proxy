import { Platform } from 'react-native'
import { isPaidThisMonth, nextDueDate, sortBills } from './bills'
import { tasksForDay, todayISO, useNovaStore } from './store'

export type WidgetSnapshot = {
  greeting: string
  todayCount: number
  nextTask: string
  nextBill: string
  updatedAt: string
}

function buildSnapshot(): WidgetSnapshot {
  const store = useNovaStore.getState()
  const today = todayISO()
  const openToday = tasksForDay(store.tasks, today).filter((t) => !t.completed)
  const next = [...openToday].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))[0]
  const dueBills = sortBills(store.bills.filter((b) => b.active !== false && !isPaidThisMonth(b)))
  const bill = dueBills[0]
  const name = store.settings.name?.trim() || 'there'
  return {
    greeting: `Hi ${name}`,
    todayCount: openToday.length,
    nextTask: next
      ? `${next.time ? `${next.time} · ` : ''}${next.title}`
      : 'No timed tasks today',
    nextBill: bill
      ? `${bill.title} · due ${nextDueDate(bill)}`
      : 'No unpaid bills',
    updatedAt: new Date().toISOString(),
  }
}

/** Push Today + next bill into the iOS home/lock widget (no-op on web/Android). */
export async function refreshWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== 'ios') return
  try {
    const { default: WahrlyToday } = await import('../widgets/WahrlyToday')
    const snapshot = buildSnapshot()
    WahrlyToday.updateSnapshot(snapshot)
  } catch {
    // Widget native module only exists in a customized EAS binary
  }
}
