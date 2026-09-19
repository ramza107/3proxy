/** In-memory Expo push tokens + which meeting alerts were already pushed. */

type PushEntry = {
  token: string
  updatedAt: string
}

const tokensByUser = new Map<string, PushEntry>()
const pushedAlertIds = new Map<string, Set<string>>()

export function savePushToken(userId: string, token: string) {
  if (!userId || !token || !token.startsWith('ExponentPushToken')) return
  tokensByUser.set(userId, { token, updatedAt: new Date().toISOString() })
}

export function getPushToken(userId: string): string | null {
  return tokensByUser.get(userId)?.token || null
}

export function listPushUsers(): string[] {
  return [...tokensByUser.keys()]
}

export function wasAlertPushed(userId: string, alertId: string) {
  return pushedAlertIds.get(userId)?.has(alertId) === true
}

export function markAlertPushed(userId: string, alertId: string) {
  const set = pushedAlertIds.get(userId) || new Set<string>()
  set.add(alertId)
  // cap memory
  if (set.size > 200) {
    const keep = [...set].slice(-120)
    pushedAlertIds.set(userId, new Set(keep))
  } else {
    pushedAlertIds.set(userId, set)
  }
}

export async function sendExpoPush(params: {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}): Promise<boolean> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.token,
        title: params.title,
        body: params.body,
        sound: 'default',
        data: params.data || {},
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
