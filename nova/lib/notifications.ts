import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { Task } from '../types'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice && Platform.OS !== 'web') {
    return false
  }

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true

  const asked = await Notifications.requestPermissionsAsync()
  return asked.granted
}

function taskTriggerDate(task: Task): Date | null {
  if (!task.date) return null
  const [y, m, d] = task.date.split('-').map(Number)
  const [hh, mm] = (task.time || '09:00').split(':').map(Number)
  const when = new Date(y, m - 1, d, hh, mm, 0, 0)
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now() + 5000) return null
  return when
}

export async function scheduleTaskNotification(
  task: Task,
  enabled: boolean,
): Promise<string | null> {
  if (!enabled || task.completed) return null
  const when = taskTriggerDate(task)
  if (!when) return null

  const granted = await ensureNotificationPermissions()
  if (!granted) return null

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'NOVA',
      body: `Time to ${task.title.toLowerCase()} ✨`,
      data: { taskId: task.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  })
}

export async function cancelNotification(notificationId?: string | null) {
  if (!notificationId) return
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  } catch {
    // ignore
  }
}
