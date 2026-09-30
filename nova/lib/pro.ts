/** Wahrly Pro gates — Free vs Pro feature access (demo toggle until StoreKit). */

import { localISODate } from './localDate'
import { useNovaStore } from './store'

/** Free voice transcripts per calendar day. */
export const FREE_VOICE_PER_DAY = 5
/** Pro fair-use ceiling (not true unlimited — abuse protection). */
export const PRO_VOICE_PER_DAY = 200
/** Free AI chat messages per calendar day. */
export const FREE_CHAT_PER_DAY = 40
/** Pro chat fair-use ceiling. */
export const PRO_CHAT_PER_DAY = 400
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

export function chatDailyLimit(): number {
  return isPro() ? PRO_CHAT_PER_DAY : FREE_CHAT_PER_DAY
}

export function chatRemainingToday(): number {
  const s = useNovaStore.getState().settings
  const today = localISODate()
  const limit = chatDailyLimit()
  if (s.chatUsedDate !== today) return limit
  return Math.max(0, limit - (s.chatUsedCount || 0))
}

export function canUseChat(): boolean {
  return chatRemainingToday() > 0
}

/** Call after a successful paid AI chat turn (not local/email shortcuts). */
export function consumeChatCredit() {
  const store = useNovaStore.getState()
  const today = localISODate()
  const sameDay = store.settings.chatUsedDate === today
  store.updateSettings({
    chatUsedDate: today,
    chatUsedCount: sameDay ? (store.settings.chatUsedCount || 0) + 1 : 1,
  })
}
