/** In-memory chat fair-use — Free has 0 cloud chats; Pro is capped. */

const MIN_GAP_MS = 800
/** Absolute ceiling per user/IP. */
const HARD_MAX_PER_DAY = 500
/** Free cloud chat — disabled (local AI on client only). */
const FREE_MAX_PER_DAY = 0
const PRO_MAX_PER_DAY = 400

type Bucket = {
  lastAt: number
  day: string
  count: number
}

const buckets = new Map<string, Bucket>()

function todayUTC() {
  return new Date().toISOString().slice(0, 10)
}

function prune(now: number) {
  if (buckets.size < 4_000) return
  for (const [k, v] of buckets) {
    if (now - v.lastAt > 48 * 3600_000) buckets.delete(k)
  }
}

export function chatDailyCap(isPro: boolean) {
  return isPro ? PRO_MAX_PER_DAY : FREE_MAX_PER_DAY
}

/**
 * Returns null if OK, otherwise an error message.
 * `is_pro` is advisory until StoreKit receipts are verified server-side.
 */
export function checkChatRateLimit(params: {
  userId?: string | null
  ip?: string | null
  isPro?: boolean
}): string | null {
  const now = Date.now()
  prune(now)
  const day = todayUTC()
  const isPro = params.isPro === true
  const softCap = chatDailyCap(isPro)

  if (!isPro || softCap <= 0) {
    return 'Cloud chat is Wahrly Pro — turn on Pro in Settings'
  }

  const keys = [
    params.userId ? `u:${params.userId}` : null,
    params.ip ? `ip:${params.ip}` : null,
  ].filter(Boolean) as string[]
  if (!keys.length) keys.push('anon')

  for (const key of keys) {
    const prev = buckets.get(key)
    if (!prev) continue
    if (now - prev.lastAt < MIN_GAP_MS) {
      return 'Too many chat requests — wait a moment'
    }
    const count = prev.day === day ? prev.count : 0
    if (count >= HARD_MAX_PER_DAY || count >= softCap) {
      return 'Pro daily chat fair-use reached — try again tomorrow'
    }
  }

  for (const key of keys) {
    const prev = buckets.get(key)
    const count = prev && prev.day === day ? prev.count + 1 : 1
    buckets.set(key, { lastAt: now, day, count })
  }
  return null
}
