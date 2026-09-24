/** Wahrly Pro gates — Free vs Pro feature access (demo toggle until StoreKit). */

import { localISODate } from './localDate'
import { useNovaStore } from './store'

/** Free voice transcripts per calendar day. */
export const FREE_VOICE_PER_DAY = 5
/** Pro fair-use ceiling (not true unlimited — abuse protection). */
export const PRO_VOICE_PER_DAY = 200
/** Max recording length before auto-stop (seconds). */
export const MAX_VOICE_SECONDS = 60
/** Min gap between voice submits on the client (ms). */
export const VOICE_COOLDOWN_MS = 8_000

export function isPro(): boolean {
  return useNovaStore.getState().settings.isPro === true
}

export function useIsPro(): boolean {
  return useNovaStore((s) => s.settings.isPro === true)
}

/** Auto-add Gmail promises — Pro only. */
export function canUseAutoPromises(): boolean {
  return isPro()
}

/** Weekly brief — Pro only (morning brief stays free). */
export function canUseWeeklyBrief(): boolean {
  return isPro()
}

export function voiceDailyLimit(): number {
  return isPro() ? PRO_VOICE_PER_DAY : FREE_VOICE_PER_DAY
}

export function voiceRemainingToday(): number {
  const s = useNovaStore.getState().settings
  const today = localISODate()
  const limit = voiceDailyLimit()
  if (s.voiceUsedDate !== today) return limit
  return Math.max(0, limit - (s.voiceUsedCount || 0))
}

export function canUseVoice(): boolean {
  return voiceRemainingToday() > 0
}

/** Call after a successful voice transcript (Free and Pro). */
export function consumeVoiceCredit() {
  const store = useNovaStore.getState()
  const today = localISODate()
  const sameDay = store.settings.voiceUsedDate === today
  store.updateSettings({
    voiceUsedDate: today,
    voiceUsedCount: sameDay ? (store.settings.voiceUsedCount || 0) + 1 : 1,
  })
}
