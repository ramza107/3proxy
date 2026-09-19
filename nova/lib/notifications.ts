import { Platform } from 'react-native'
import type { Task, UserSettings } from '../types'
import { tasksForDay, todayISO } from './store'

let Notifications: typeof import('expo-notifications') | null = null

const MORNING_ID_KEY = 'wahrly-morning-brief'
const EVENING_ID_KEY = 'wahrly-evening-clear'

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

function parseHm(value: string): { hour: number; minute: number } | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}

export function formatHm(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
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
      title: 'Wahrly',
      body: `Time to ${task.title.toLowerCase()}`,
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

async function cancelByIdentifier(identifier: string) {
  if (Platform.OS === 'web') return
  try {
    const NotificationsMod = await getNotifications()
    if (!NotificationsMod) return
    // Cancel any previously scheduled with same content data id via getAll + filter
    const all = await NotificationsMod.getAllScheduledNotificationsAsync()
    await Promise.all(
      all
        .filter((n) => n.content.data?.ritualId === identifier || n.identifier === identifier)
        .map((n) => NotificationsMod.cancelScheduledNotificationAsync(n.identifier)),
    )
  } catch {
    // ignore
  }
}

function morningBody(tasks: Task[], emailDigestEnabled?: boolean) {
  const today = tasksForDay(tasks, todayISO())
  const inboxHint = emailDigestEnabled
    ? '\nOpen Wahrly for who wrote yesterday (your local day).'
    : ''
  if (!today.length) {
    return `Good morning. Your day looks clear — open Wahrly if you want to add something.${inboxHint}`
  }
  const preview = today
    .slice(0, 4)
    .map((t, i) => `${i + 1}. ${t.title}${t.time ? ` (${t.time})` : ''}`)
    .join('\n')
  const more = today.length > 4 ? `\n+${today.length - 4} more` : ''
  return `Good morning — today's list:\n${preview}${more}${inboxHint}`
}

export async function syncDailyRitualNotifications(
  settings: UserSettings,
  tasks: Task[],
): Promise<{ morningOk: boolean; eveningOk: boolean; webNote?: string }> {
  if (Platform.OS === 'web') {
    return {
      morningOk: false,
      eveningOk: false,
      webNote: 'Daily reminders work on iOS/Android. Web can save times for later.',
    }
  }

  await cancelByIdentifier(MORNING_ID_KEY)
  await cancelByIdentifier(EVENING_ID_KEY)

  if (!settings.notificationsEnabled) {
    return { morningOk: false, eveningOk: false }
  }

  const granted = await ensureNotificationPermissions()
  if (!granted) return { morningOk: false, eveningOk: false }

  const NotificationsMod = await getNotifications()
  if (!NotificationsMod) return { morningOk: false, eveningOk: false }

  let morningOk = false
  let eveningOk = false

  if (settings.morningBriefEnabled) {
    const hm = parseHm(settings.morningBriefTime)
    if (hm) {
      await NotificationsMod.scheduleNotificationAsync({
        content: {
          title: 'Wahrly · Morning brief',
          body: morningBody(tasks, settings.emailDigestEnabled !== false),
          data: { ritualId: MORNING_ID_KEY, kind: 'morning' },
        },
        trigger: {
          type: NotificationsMod.SchedulableTriggerInputTypes.DAILY,
          hour: hm.hour,
          minute: hm.minute,
        },
        identifier: MORNING_ID_KEY,
      })
      morningOk = true
    }
  }

  if (settings.eveningClearEnabled) {
    const hm = parseHm(settings.eveningClearTime)
    if (hm) {
      await NotificationsMod.scheduleNotificationAsync({
        content: {
          title: 'Wahrly · Evening Clear',
          body: "Before sleep: check tomorrow's list. Add what matters, drop what doesn't.",
          data: { ritualId: EVENING_ID_KEY, kind: 'evening' },
        },
        trigger: {
          type: NotificationsMod.SchedulableTriggerInputTypes.DAILY,
          hour: hm.hour,
          minute: hm.minute,
        },
        identifier: EVENING_ID_KEY,
      })
      eveningOk = true
    }
  }

  return { morningOk, eveningOk }
}

/** Immediate local notification for an inbox meeting / report ask. */
export async function notifyMeetingEmail(params: {
  title?: string
  body: string
  alertId: string
  enabled: boolean
}): Promise<boolean> {
  if (Platform.OS === 'web' || !params.enabled) return false
  const granted = await ensureNotificationPermissions()
  if (!granted) return false
  const NotificationsMod = await getNotifications()
  if (!NotificationsMod) return false
  try {
    await NotificationsMod.scheduleNotificationAsync({
      content: {
        title: params.title || 'Wahrly · Inbox',
        body: params.body,
        data: { kind: 'meeting', alertId: params.alertId },
      },
      trigger: null,
    })
    return true
  } catch {
    return false
  }
}

/** Best-effort Expo push token for server-side meeting alerts. */
export async function registerDevicePushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !userId) return null
  try {
    const granted = await ensureNotificationPermissions()
    if (!granted) return null
    const NotificationsMod = await getNotifications()
    if (!NotificationsMod) return null
    const Constants = await import('expo-constants')
    const projectId =
      Constants.default?.easConfig?.projectId ||
      (Constants.default?.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId
    const tokenRes = projectId
      ? await NotificationsMod.getExpoPushTokenAsync({ projectId })
      : await NotificationsMod.getExpoPushTokenAsync()
    const token = tokenRes.data
    if (!token) return null
    const { registerPushToken } = await import('./emailApi')
    await registerPushToken(userId, token)
    return token
  } catch {
    return null
  }
}

export { parseHm }
