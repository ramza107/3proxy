import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'
import type { ComponentType } from 'react'
import { Platform } from 'react-native'

const extra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>

const dsn =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SENTRY_DSN) ||
  (typeof extra.sentryDsn === 'string' ? extra.sentryDsn : '') ||
  ''

let started = false

/** Crash / error reporting. No-op until EXPO_PUBLIC_SENTRY_DSN is set. */
export function initMonitoring() {
  if (started || !dsn) return
  started = true
  Sentry.init({
    dsn,
    // Skip noisy local Metro sessions unless you explicitly want them.
    enabled: !__DEV__,
    environment:
      (typeof extra.appEnv === 'string' && extra.appEnv) ||
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_ENV) ||
      (__DEV__ ? 'development' : 'production'),
    release: `wahrly@${Constants.expoConfig?.version || '1.0.0'}`,
    dist: Platform.OS,
    tracesSampleRate: 0.15,
  })
}

export function identifyUser(userId: string | null, email?: string | null) {
  if (!started) return
  if (!userId) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({ id: userId, email: email || undefined })
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!started) return
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context)
    Sentry.captureException(error)
  })
}

export function wrapRoot<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return dsn ? Sentry.wrap(Component) : Component
}
