import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing } from '../../constants/theme'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <View style={styles.screen}>
      <View style={styles.glow} />
      <Text style={styles.emoji}>👋</Text>
      <Text style={styles.title}>Hi</Text>
      <Text style={styles.body}>
        I&apos;m NOVA.{"\n"}
        Tell me what you need to get done.
      </Text>
      <Pressable style={styles.btn} onPress={() => router.push('/(onboarding)/name')}>
        <Text style={styles.btnText}>Get started</Text>
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
  glow: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  emoji: { fontSize: 42 },
  title: { color: colors.text, fontSize: 44, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 20, lineHeight: 30, marginBottom: spacing.lg },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#0B0D12', fontWeight: '800', fontSize: 17 },
})
