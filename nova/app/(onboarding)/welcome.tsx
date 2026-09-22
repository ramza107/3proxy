import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { useT } from '../../lib/useT'

export default function WelcomeScreen() {
  const t = useT()
  const router = useRouter()

  return (
    <Screen>
      <View style={styles.screen}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.title}>{t('onboarding.welcomeTitle')}</Text>
        <Text style={styles.body}>{t('onboarding.welcomeSub')}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.btn}
          onPress={() => router.push('/name')}
        >
          <Text style={styles.btnText}>{t('onboarding.getStarted')}</Text>
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
    gap: spacing.md,
  },
  brand: {
    color: colors.accentStrong,
    fontSize: 22,
    fontFamily: fonts.brand,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 46,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  body: {
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 28,
    fontFamily: fonts.body,
    marginBottom: spacing.lg,
    maxWidth: 340,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only
    cursor: 'pointer',
    zIndex: 2,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 17 },
})
