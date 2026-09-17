import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, radii, spacing } from '../../constants/theme'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { useNovaStore } from '../../lib/store'

export default function NameScreen() {
  const router = useRouter()
  const existing = useNovaStore((s) => s.settings.name)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)
  const [name, setName] = useState(existing || '')

  const continueNext = async () => {
    const value = name.trim() || 'Friend'
    updateSettings({ name: value })
    if (isSupabaseConfigured && sessionUserId) {
      const supabase = getSupabase()
      await supabase?.from('users').update({ name: value }).eq('id', sessionUserId)
    }
    router.push('/(onboarding)/ready')
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>What&apos;s your name?</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textDim}
        style={styles.input}
        autoFocus
      />
      <Pressable style={styles.btn} onPress={continueNext}>
        <Text style={styles.btnText}>Continue</Text>
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
    gap: spacing.lg,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '800' },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#0B0D12', fontWeight: '800', fontSize: 17 },
})
