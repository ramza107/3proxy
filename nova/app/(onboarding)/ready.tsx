import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing } from '../../constants/theme'
import { useNovaStore } from '../../lib/store'

export default function ReadyScreen() {
  const router = useRouter()
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const updateSettings = useNovaStore((s) => s.updateSettings)

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Nice to meet you, {name}.</Text>
      <Text style={styles.body}>Try saying:</Text>
      <View style={styles.example}>
        <Text style={styles.exampleText}>
          &quot;Remind me to call Mom tomorrow at 7.&quot;
        </Text>
      </View>
      <Pressable
        style={styles.btn}
        onPress={() => {
          updateSettings({ onboardingComplete: true })
          router.replace('/(tabs)/home')
        }}
      >
        <Text style={styles.btnText}>Start using NOVA</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', lineHeight: 42 },
  body: { color: colors.textMuted, fontSize: 16 },
  example: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  exampleText: { color: colors.accentStrong, fontSize: 17, lineHeight: 26 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#0B0D12', fontWeight: '800', fontSize: 17 },
})
