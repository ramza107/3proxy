/** In-memory voice abuse guards for /api/ai/transcribe. */

const MAX_AUDIO_BYTES = 2 * 1024 * 1024 // ~60s m4a comfortably under this
const MIN_GAP_MS = 8_000
const MAX_PER_DAY = 250 // hard server cap (covers Free + Pro fair use)

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
  if (buckets.size < 2_000) return
  for (const [k, v] of buckets) {
    if (now - v.lastAt > 48 * 3600_000) buckets.delete(k)
  }
}

export function voiceUploadLimits() {
  return { fileSize: MAX_AUDIO_BYTES }
}

export function assertVoicePayloadSize(bytes: number): void {
  if (bytes > MAX_AUDIO_BYTES) {
    throw new Error(`Audio too long — keep under ~60 seconds (max ${MAX_AUDIO_BYTES} bytes)`)
  }
  if (bytes < 200) {
    throw new Error('Empty recording — hold Mic a second longer')
  }
}

/**
 * Per-client throttle. Prefer userId when provided; always also key by IP.
 * Returns null if OK, otherwise an error message.
 */
export function checkVoiceRateLimit(params: {
  userId?: string | null
  ip?: string | null
}): string | null {
  const now = Date.now()
  prune(now)
  const day = todayUTC()
  const keys = [
    params.userId ? `u:${params.userId}` : null,
    params.ip ? `ip:${params.ip}` : null,
  ].filter(Boolean) as string[]

  if (!keys.length) keys.push('anon')

  for (const key of keys) {
    const prev = buckets.get(key)
    if (!prev) continue
    if (now - prev.lastAt < MIN_GAP_MS) {
      return 'Too many voice requests — wait a few seconds'
    }
    const count = prev.day === day ? prev.count : 0
    if (count >= MAX_PER_DAY) {
      return 'Daily voice limit reached — try again tomorrow'
    }
  }

  for (const key of keys) {
    const prev = buckets.get(key)
    const count = prev && prev.day === day ? prev.count + 1 : 1
    buckets.set(key, { lastAt: now, day, count })
  }
  return null
}
