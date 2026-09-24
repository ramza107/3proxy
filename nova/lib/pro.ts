/** Wahrly Pro gates — Free vs Pro feature access (demo toggle until StoreKit). */

import { localISODate } from './localDate'
import { useNovaStore } from './store'

/** Free voice transcripts per calendar day. */
export const FREE_VOICE_PER_DAY = 5

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

export function voiceRemainingToday(): number {
  if (isPro()) return Infinity
  const s = useNovaStore.getState().settings
  const today = localISODate()
  if (s.voiceUsedDate !== today) return FREE_VOICE_PER_DAY
  return Math.max(0, FREE_VOICE_PER_DAY - (s.voiceUsedCount || 0))
}

export function canUseVoice(): boolean {
  return voiceRemainingToday() > 0
}

/** Call after a successful voice transcript on Free. */
export function consumeVoiceCredit() {
  if (isPro()) return
  const store = useNovaStore.getState()
  const today = localISODate()
  const sameDay = store.settings.voiceUsedDate === today
  store.updateSettings({
    voiceUsedDate: today,
    voiceUsedCount: sameDay ? (store.settings.voiceUsedCount || 0) + 1 : 1,
  })
}
