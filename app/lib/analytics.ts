import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

const extra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>

const apiKey =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_POSTHOG_KEY) ||
  (typeof extra.posthogKey === 'string' ? extra.posthogKey : '') ||
  ''

const host = (
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_POSTHOG_HOST) ||
  (typeof extra.posthogHost === 'string' ? extra.posthogHost : '') ||
  'https://us.i.posthog.com'
).replace(/\/$/, '')

const ANON_KEY = 'wahrly.analytics.anonId'
let distinctId: string | null = null
let ready: Promise<void> | null = null

async function ensureId() {
  if (distinctId) return
  if (!ready) {
    ready = (async () => {
      try {
        const stored = await AsyncStorage.getItem(ANON_KEY)
        if (stored) {
          distinctId = stored
          return
        }
        const id = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
        await AsyncStorage.setItem(ANON_KEY, id)
        distinctId = id
      } catch {
        distinctId = `anon_${Math.random().toString(36).slice(2)}`
      }
    })()
  }
  await ready
}

/**
 * Product analytics via PostHog HTTP capture (no native SDK).
 * No-op until EXPO_PUBLIC_POSTHOG_KEY is set. Never send task titles / email bodies.
 */
export async function track(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!apiKey) return
  try {
    await ensureId()
    const props: Record<string, string | number | boolean> = {
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version || '1.0.0',
    }
    if (properties) {
      for (const [k, v] of Object.entries(properties)) {
        if (v === undefined || v === null) continue
        props[k] = v
      }
    }
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: props,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // Analytics must never break the app.
  }
}

export async function identify(userId: string, traits?: { email?: string | null; language?: string }) {
  if (!apiKey) return
  try {
    await ensureId()
    distinctId = userId
    await AsyncStorage.setItem(ANON_KEY, userId)
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event: '$identify',
        distinct_id: userId,
        properties: {
          $set: {
            email: traits?.email || undefined,
            language: traits?.language || undefined,
            platform: Platform.OS,
          },
        },
      }),
    })
  } catch {
    // ignore
  }
}

export const AnalyticsEvents = {
  appOpen: 'app_open',
  login: 'auth_login',
  signup: 'auth_signup',
  demo: 'auth_demo',
  onboardingComplete: 'onboarding_complete',
  morningBriefShown: 'morning_brief_shown',
  planDay: 'plan_day',
  eveningClearFinish: 'evening_clear_finish',
  googleConnect: 'google_connect',
} as const
