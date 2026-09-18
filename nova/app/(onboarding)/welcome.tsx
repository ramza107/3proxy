import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <Screen>
      <View style={styles.screen}>
        <Text style={styles.brand}>{brand.name}</Text>
        <Text style={styles.title}>Hi — let&apos;s get clear.</Text>
        <Text style={styles.body}>
          I&apos;m Wahrly.{"\n"}
          Tell me what you need done, and I&apos;ll turn it into a calm plan.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={styles.btn}
          onPress={() => router.push('/name')}
        >
          <Text style={styles.btnText}>Get started</Text>
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
