import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Screen } from '../../components/Screen'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { useNovaStore } from '../../lib/store'

export default function SignupScreen() {
  const router = useRouter()
  const setDemoSession = useNovaStore((s) => s.setDemoSession)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSignup = async () => {
    setError('')
    setLoading(true)
    try {
      if (!email.trim() || !password.trim()) throw new Error('Enter email and password')
      if (password.length < 6) throw new Error('Password must be at least 6 characters')

      if (isSupabaseConfigured) {
        const supabase = getSupabase()!
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() || null } },
        })
        if (err) throw err
        if (data.user) {
          await supabase.from('users').upsert({
            id: data.user.id,
            email: email.trim(),
            name: name.trim() || null,
          })
          useNovaStore.setState({
            demoMode: false,
            sessionUserId: data.user.id,
            sessionEmail: email.trim(),
          })
        }
      } else {
        setDemoSession(email.trim(), name.trim())
      }

      updateSettings({
        name: name.trim(),
        onboardingComplete: false,
      })
      router.replace('/welcome')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.sub}>Wahrly will help you organize your everyday life.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Alex"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          accessibilityRole="button"
          style={styles.btn}
          onPress={onSignup}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={styles.btnText}>Sign up</Text>}
        </Pressable>
      </View>

      <Link href="/login" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: 34, fontFamily: fonts.brand, letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontSize: 15, marginBottom: 8, fontFamily: fonts.body },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  label: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.bodyMedium },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only
    cursor: 'pointer',
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  error: { color: colors.danger },
  link: { color: colors.accentStrong, textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 15 },
})
