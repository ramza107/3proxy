/** Per-user Gmail queue + TTL cache — Home used to fire digest+promises+meetings
 * in parallel and blow Google’s ~250 units/min/user budget.
 *
 * Longer TTLs are intentional unit-econ: cold Home is expensive (Gmail + AI);
 * warm cache should absorb soft polls and push sweeps. */

type CacheEntry = { at: number; payload: unknown }

const cache = new Map<string, CacheEntry>()
const tails = new Map<string, Promise<unknown>>()

/** Default for digest / promises / meetings API responses. */
export const GMAIL_CACHE_TTL_MS = 45 * 60 * 1000
/** Background push poll — even stickier; app-open path still refreshes on demand. */
export const GMAIL_PUSH_POLL_TTL_MS = 90 * 60 * 1000

const DEFAULT_TTL_MS = GMAIL_CACHE_TTL_MS

export function gmailCacheKey(userId: string, kind: string, extra = '') {
  return `${userId}::${kind}::${extra}`
}

export function peekGmailCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > ttlMs) {
    cache.delete(key)
    return null
  }
  return hit.payload as T
}

export function setGmailCache(key: string, payload: unknown) {
  cache.set(key, { at: Date.now(), payload })
}

export function clearGmailCacheForUser(userId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}::`)) cache.delete(key)
  }
}

/** Serialize all Gmail-backed work for one user (digest / promises / meetings / poll). */
export function enqueueGmailUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(userId) || Promise.resolve()
  const next = prev.then(fn, fn)
  tails.set(
    userId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  )
  return next
}

export async function withGmailCache<T>(
  key: string,
  fn: () => Promise<T>,
  opts?: { ttlMs?: number; force?: boolean },
): Promise<T> {
  const ttl = opts?.ttlMs ?? DEFAULT_TTL_MS
  if (!opts?.force) {
    const hit = peekGmailCache<T>(key, ttl)
    if (hit != null) return hit
  }
  const payload = await fn()
  setGmailCache(key, payload)
  return payload
}

export function isGmailQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '')
  return /Quota exceeded|Total Query Cost|rateLimitExceeded|userRateLimitExceeded|Gmail is busy/i.test(
    msg,
  )
}

export function friendlyGmailError(err: unknown, fallback: string): string {
  if (isGmailQuotaError(err)) {
    return 'Gmail is busy — try again in a minute'
  }
  if (err instanceof Error && err.message && err.message.length <= 120) {
    if (/Gmail (list|sent|inbox|request) failed/i.test(err.message)) {
      return fallback
    }
    return err.message
  }
  return fallback
}
