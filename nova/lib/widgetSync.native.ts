import { Platform } from 'react-native'
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

function buildSnapshot(): WidgetSnapshot {
  const store = useNovaStore.getState()
  const today = localISODate()
  const openToday = tasksForDay(store.tasks, today)
  const nearest = findNearestTask(store.tasks)
  const moreToday = Math.max(0, openToday.length - (nearest?.date === today ? 1 : 0))

  if (!nearest) {
    return {
      label: 'WAHRLY',
      time: '',
      title: 'No upcoming tasks',
      subtitle: 'Ask Wahrly to add one',
      updatedAt: new Date().toISOString(),
      greeting: 'Wahrly',
      todayCount: 0,
      nextTask: 'No upcoming tasks',
      nextBill: '',
    }
  }

  const time = formatNearestTaskTime(nearest)
  const label = nearestTaskLabel(nearest, today)
  const subtitle =
    nearest.date === today
      ? moreToday > 0
        ? `${moreToday} more today`
        : openToday.length <= 1
          ? 'Today'
          : ''
      : nearest.date
        ? nearest.date
        : 'No date'

  return {
    label,
    time,
    title: nearest.title,
    subtitle,
    updatedAt: new Date().toISOString(),
    greeting: label,
    todayCount: openToday.length,
    nextTask: time ? `${time} · ${nearest.title}` : nearest.title,
    nextBill: subtitle,
  }
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
