/** In-memory chat fair-use for /api/ai/chat — keeps Free from blowing AI spend. */

const MIN_GAP_MS = 800
/** Absolute ceiling per user/IP regardless of Pro claim. */
const HARD_MAX_PER_DAY = 500
const FREE_MAX_PER_DAY = 40
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
 * Client `is_pro` is advisory until StoreKit receipts are verified server-side.
 */
export function checkChatRateLimit(params: {
  userId?: string | null
  ip?: string | null
  isPro?: boolean
}): string | null {
  const now = Date.now()
  prune(now)
  const day = todayUTC()
  const softCap = chatDailyCap(params.isPro === true)
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
    if (count >= HARD_MAX_PER_DAY) {
      return 'Daily chat limit reached — try again tomorrow'
    }
    if (count >= softCap) {
      return params.isPro
        ? 'Pro daily chat fair-use reached — try again tomorrow'
        : 'Free daily chat limit reached — upgrade to Pro or try tomorrow'
    }
  }

  for (const key of keys) {
    const prev = buckets.get(key)
    const count = prev && prev.day === day ? prev.count + 1 : 1
    buckets.set(key, { lastAt: now, day, count })
  }
  return null
}
