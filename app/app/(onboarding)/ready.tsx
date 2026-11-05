import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { AnalyticsEvents, track } from '../../lib/analytics'
import { persistOnboardingComplete } from '../../lib/onboardingProfile'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'

export default function ReadyScreen() {
  const t = useT()
  const router = useRouter()
  const name = useNovaStore((s) => s.settings.name) || 'there'

  const finish = (to: '/tasks' | '/home') => {
    void persistOnboardingComplete()
    void track(AnalyticsEvents.onboardingComplete)
    router.replace(to)
  }

  return (
    <Screen>
      <View style={styles.screen}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.title}>{t.tf('onboarding.readyTitle', { name })}</Text>
        <Text style={styles.body}>{t('onboarding.readyFree')}</Text>
        <Text style={styles.proHint}>{t('onboarding.readyPro')}</Text>
        <Text style={styles.tryLabel}>{t('onboarding.trySaying')}</Text>
        <Text style={styles.exampleText}>&quot;{t('onboarding.example')}&quot;</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.btn}
          onPress={() => finish('/tasks')}
        >
          <Text style={styles.btnText}>{t('onboarding.start')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => finish('/home')}
          hitSlop={8}
        >
          <Text style={styles.secondary}>{t('onboarding.valueHomeCta')}</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  brand: {
    color: colors.accentStrong,
    fontSize: 15,
    fontFamily: fonts.brand,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.brand,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
    maxWidth: 340,
  },
  proHint: {
    color: colors.textDim,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.body,
    maxWidth: 340,
    marginBottom: 4,
  },
  tryLabel: { color: colors.textMuted, fontSize: 15, fontFamily: fonts.bodyMedium, marginTop: 4 },
  exampleText: {
    color: colors.accentStrong,
    fontSize: 18,
    lineHeight: 28,
    fontFamily: fonts.brandItalic,
    marginBottom: spacing.sm,
    maxWidth: 340,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 17 },
  secondary: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
})
