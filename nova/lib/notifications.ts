import { Platform } from 'react-native'
import type { Task } from '../types'

let Notifications: typeof import('expo-notifications') | null = null

async function getNotifications() {
  if (Platform.OS === 'web') return null
  if (!Notifications) {
    Notifications = await import('expo-notifications')
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
  }
  return Notifications
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    const Device = await import('expo-device')
    const NotificationsMod = await getNotifications()
    if (!NotificationsMod) return false
    if (!Device.isDevice) return false

    const current = await NotificationsMod.getPermissionsAsync()
    if (current.granted) return true
    const asked = await NotificationsMod.requestPermissionsAsync()
    return asked.granted
  } catch {
    return false
  }
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
  if (Platform.OS === 'web' || !enabled || task.completed) return null
  const when = taskTriggerDate(task)
  if (!when) return null

  const granted = await ensureNotificationPermissions()
  if (!granted) return null

  const NotificationsMod = await getNotifications()
  if (!NotificationsMod) return null

  return NotificationsMod.scheduleNotificationAsync({
    content: {
      title: 'NOVA',
      body: `Time to ${task.title.toLowerCase()} ✨`,
      data: { taskId: task.id },
    },
    trigger: {
      type: NotificationsMod.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  })
}

export async function cancelNotification(notificationId?: string | null) {
  if (Platform.OS === 'web' || !notificationId) return
  try {
    const NotificationsMod = await getNotifications()
    await NotificationsMod?.cancelScheduledNotificationAsync(notificationId)
  } catch {
    // ignore
  }
}
