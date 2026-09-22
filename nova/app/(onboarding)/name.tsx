import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '../../components/Screen'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'

export default function NameScreen() {
  const t = useT()
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
    router.push('/ready')
  }

  return (
    <Screen>
      <View style={styles.screen}>
        <Text style={styles.title}>{t('onboarding.nameTitle')}</Text>
        <Text style={styles.sub}>{t('onboarding.nameSub')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('auth.namePlaceholder')}
          placeholderTextColor={colors.textDim}
          style={styles.input}
          autoFocus
        />
        <Pressable accessibilityRole="button" style={styles.btn} onPress={continueNext}>
          <Text style={styles.btnText}>{t('common.continue')}</Text>
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
    gap: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fonts.brand,
    letterSpacing: -0.6,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 16,
    fontFamily: fonts.body,
    marginTop: -8,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
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
