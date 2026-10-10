/** Wahrly Pro gates — Free is near-zero COGS; autopilot features are Pro-only. */

import { localISODate } from './localDate'
import { useNovaStore } from './store'

/** Free cloud voice — none (Whisper costs money). */
export const FREE_VOICE_PER_DAY = 0
/** Pro fair-use ceiling. */
export const PRO_VOICE_PER_DAY = 200
/** Free cloud chat — none (Groq/OpenAI costs money). Free uses on-device local AI. */
export const FREE_CHAT_PER_DAY = 0
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

/**
 * Hard split:
 * Free = you run the day (tasks, local AI, calendar, news, manual loops/bills, simple evening).
 * Pro = Wahrly runs the day with you (Plan day, smart morning, reminders, digest, widget, cloud AI…).
 */

/** Auto Plan day / arrange into free slots — Pro only. */
export function canUsePlanDay(): boolean {
  return isPro()
}

/** Smart morning brief (weather + Plan day shortcut) — Pro only. */
export function canUseMorningBrief(): boolean {
  return isPro()
}

/** Local push reminders for bills + promise loops — Pro only. */
export function canUseReminders(): boolean {
  return isPro()
}

/** Evening digest + reflection journal — Pro only. Free: simple done / tomorrow. */
export function canUseEveningDigest(): boolean {
  return isPro()
}

/** Home Screen widget (Next task) — Pro only. */
export function canUseWidget(): boolean {
  return isPro()
}

/** Weekly brief — Pro only. */
export function canUseWeeklyBrief(): boolean {
  return isPro()
}

/** Invest portfolio + live quotes — Pro only. */
export function canUseInvestments(): boolean {
  return isPro()
}

export function voiceDailyLimit(): number {
  return isPro() ? PRO_VOICE_PER_DAY : FREE_VOICE_PER_DAY
}

export function voiceRemainingToday(): number {
  const s = useNovaStore.getState().settings
  const today = localISODate()
  const limit = voiceDailyLimit()
  if (limit <= 0) return 0
  if (s.voiceUsedDate !== today) return limit
  return Math.max(0, limit - (s.voiceUsedCount || 0))
}

export function canUseVoice(): boolean {
  return isPro() && voiceRemainingToday() > 0
}

/** Call after a successful voice transcript. */
export function consumeVoiceCredit() {
  if (!isPro()) return
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
  if (limit <= 0) return 0
  if (s.chatUsedDate !== today) return limit
  return Math.max(0, limit - (s.chatUsedCount || 0))
}

/** Cloud LLM chat — Pro only. Free uses local AI with no meter. */
export function canUseCloudChat(): boolean {
  return isPro() && chatRemainingToday() > 0
}

/** Call after a successful cloud AI chat turn. */
export function consumeChatCredit() {
  if (!isPro()) return
  const store = useNovaStore.getState()
  const today = localISODate()
  const sameDay = store.settings.chatUsedDate === today
  store.updateSettings({
    chatUsedDate: today,
    chatUsedCount: sameDay ? (store.settings.chatUsedCount || 0) + 1 : 1,
  })
}
