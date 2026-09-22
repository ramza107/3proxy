import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../../components/Screen'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { useNovaStore } from '../../lib/store'

export default function ReadyScreen() {
  const router = useRouter()
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const updateSettings = useNovaStore((s) => s.updateSettings)

  return (
    <Screen>
      <View style={styles.screen}>
        <Text style={styles.title}>Nice to meet you, {name}.</Text>
        <Text style={styles.body}>Try saying:</Text>
        <View style={styles.example}>
          <Text style={styles.exampleText}>
            &quot;Remind me to call Mom tomorrow at 7.&quot;
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.btn}
          onPress={() => {
            updateSettings({ onboardingComplete: true })
            router.replace('/tasks')
          }}
        >
          <Text style={styles.btnText}>Start using Wahrly</Text>
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
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.brand,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  body: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.body },
  example: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  exampleText: {
    color: colors.accentStrong,
    fontSize: 17,
    lineHeight: 26,
    fontFamily: fonts.brandItalic,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only
    cursor: 'pointer',
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 17 },
})
