import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { Screen } from '../../components/Screen'
import { colors, fonts, spacing } from '../../constants/theme'
import { createSessionFromUrl } from '../../lib/socialAuth'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'

/**
 * OAuth return landing (wahrly://auth/callback or web /auth/callback).
 * Completes the Supabase session from the redirect URL.
 */
export default function AuthCallbackScreen() {
  const t = useT()
  const router = useRouter()
  const onboardingComplete = useNovaStore((s) => s.settings.onboardingComplete)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const url = await Linking.getInitialURL()
        if (!url) {
          // Web: tokens often land in the hash / query of the current location.
          if (typeof window !== 'undefined' && window.location?.href) {
            await createSessionFromUrl(window.location.href)
          } else {
            throw new Error('Missing auth redirect URL')
          }
        } else {
          await createSessionFromUrl(url)
        }
        if (cancelled) return
        router.replace(onboardingComplete ? '/tasks' : '/welcome')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : t('auth.socialFailed'))
        setTimeout(() => router.replace('/login'), 2200)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [onboardingComplete, router, t])

  return (
    <Screen>
      <View style={styles.box}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.text}>{t('auth.finishingSignIn')}</Text>
          </>
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  text: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 15 },
  error: { color: colors.danger, fontFamily: fonts.body, textAlign: 'center' },
})
