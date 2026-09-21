/** Durable Expo push tokens + which meeting alerts were already pushed. */

import fs from 'fs'
import path from 'path'

type PushEntry = {
  token: string
  updatedAt: string
}

type PushFile = {
  tokens: Record<string, PushEntry>
  alerts: Record<string, string[]>
}

const tokensByUser = new Map<string, PushEntry>()
const pushedAlertIds = new Map<string, Set<string>>()

function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), '.data')
}

function filePath() {
  return path.join(dataDir(), 'push-store.json')
}

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8')
    const data = JSON.parse(raw) as PushFile
    for (const [userId, entry] of Object.entries(data.tokens || {})) {
      if (entry?.token?.startsWith('ExponentPushToken')) {
        tokensByUser.set(userId, entry)
      }
    }
    for (const [userId, ids] of Object.entries(data.alerts || {})) {
      pushedAlertIds.set(userId, new Set(ids || []))
    }
  } catch {
    // missing / corrupt — start empty
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    try {
      fs.mkdirSync(dataDir(), { recursive: true })
      const payload: PushFile = {
        tokens: Object.fromEntries(tokensByUser.entries()),
        alerts: Object.fromEntries(
          [...pushedAlertIds.entries()].map(([k, set]) => [k, [...set]]),
        ),
      }
      fs.writeFileSync(filePath(), JSON.stringify(payload, null, 0), 'utf8')
    } catch (e) {
      console.warn('push-store persist failed:', e)
    }
  }, 250)
}

loadFromDisk()

export function savePushToken(userId: string, token: string) {
  if (!userId || !token || !token.startsWith('ExponentPushToken')) return
  tokensByUser.set(userId, { token, updatedAt: new Date().toISOString() })
  schedulePersist()
  void saveTokenToSupabase(userId, token).catch(() => undefined)
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
  if (set.size > 200) {
    const keep = [...set].slice(-120)
    pushedAlertIds.set(userId, new Set(keep))
  } else {
    pushedAlertIds.set(userId, set)
  }
  schedulePersist()
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

async function saveTokenToSupabase(userId: string, token: string) {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key || key.includes('your_supabase')) return
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(url, key, { auth: { persistSession: false } })
  await sb.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

/** Hydrate memory from Supabase when the disk file is empty (e.g. new instance). */
export async function hydratePushTokensFromSupabase() {
  if (tokensByUser.size > 0) return
  try {
    const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!url || !key || key.includes('your_supabase')) return
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await sb.from('push_tokens').select('user_id, token, updated_at')
    if (error || !data?.length) return
    for (const row of data) {
      if (row.token?.startsWith('ExponentPushToken')) {
        tokensByUser.set(row.user_id, {
          token: row.token,
          updatedAt: row.updated_at || new Date().toISOString(),
        })
      }
    }
    schedulePersist()
  } catch {
    // optional table
  }
}
