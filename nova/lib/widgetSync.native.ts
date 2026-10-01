import { Platform } from 'react-native'
import { findNextBill, formatBillDueLabel, formatMoney } from './bills'
import { t, tf } from './i18n'
import {
  findNearestTask,
  formatNearestTaskTime,
  nearestTaskLabelKey,
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
  /** Deep link opened when the widget is tapped */
  deepLink: string
  taskId?: string
  // Kept for older widget binaries mid-update (harmless extras)
  greeting?: string
  todayCount?: number
  nextTask?: string
  nextBill?: string
  openInWahrly?: string
  emptyHeadline?: string
}

function nextBillLine(lang: string): string {
  const bill = findNextBill(useNovaStore.getState().bills)
  if (!bill) return ''
  const when = formatBillDueLabel(bill)
  const whenLabel =
    when === 'today'
      ? t(lang, 'widget.billToday')
      : when === 'tomorrow'
        ? t(lang, 'widget.billTomorrow')
        : when === 'overdue'
          ? t(lang, 'widget.billOverdue')
          : when
  return `${bill.title} · ${formatMoney(bill.amount, bill.currency)} · ${whenLabel}`
}

function buildSnapshot(): WidgetSnapshot {
  const store = useNovaStore.getState()
  const lang = store.settings.language || 'en'
  const today = localISODate()
  const openToday = tasksForDay(store.tasks, today)
  const nearest = findNearestTask(store.tasks)
  const moreToday = Math.max(0, openToday.length - (nearest?.date === today ? 1 : 0))
  const nextBill = nextBillLine(lang)
  const emptyTitle = t(lang, 'widget.emptyTitle')
  const emptySub = t(lang, 'widget.emptySub')

  if (!nearest) {
    const billTitle = nextBill ? nextBill.split(' · ')[0] : ''
    return {
      label: 'WAHRLY',
      time: '',
      title: billTitle || emptyTitle,
      subtitle: nextBill || emptySub,
      updatedAt: new Date().toISOString(),
      deepLink: nextBill ? 'wahrly://bills' : 'wahrly://tasks',
      greeting: 'Wahrly',
      todayCount: 0,
      nextTask: emptyTitle,
      nextBill,
      openInWahrly: t(lang, 'widget.open'),
      emptyHeadline: t(lang, 'widget.clear'),
    }
  }

  const time = formatNearestTaskTime(nearest)
  const label = t(lang, nearestTaskLabelKey(nearest, today))
  const subtitle =
    nearest.date === today
      ? moreToday > 0
        ? tf(lang, 'widget.moreToday', { n: moreToday })
        : openToday.length <= 1
          ? nextBill || t(lang, 'widget.today')
          : nextBill || ''
      : nearest.date
        ? nearest.date
        : t(lang, 'widget.noDate')

  return {
    label,
    time,
    title: nearest.title,
    subtitle:
      nextBill && !subtitle.includes(billTitleHint(nextBill)) ? joinSub(subtitle, nextBill) : subtitle,
    updatedAt: new Date().toISOString(),
    deepLink: `wahrly://tasks?taskId=${encodeURIComponent(nearest.id)}`,
    taskId: nearest.id,
    greeting: label,
    todayCount: openToday.length,
    nextTask: time ? `${time} · ${nearest.title}` : nearest.title,
    nextBill,
    openInWahrly: t(lang, 'widget.open'),
    emptyHeadline: t(lang, 'widget.soon'),
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
    const snapshot = buildSnapshot()
    WahrlyToday.updateSnapshot(snapshot)
    // Force WidgetKit to re-read App Group timeline after writing.
    WahrlyToday.reload()
  } catch {
    // Widget native module only exists in a customized EAS binary
  }
}
