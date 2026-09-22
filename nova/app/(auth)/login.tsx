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
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { useNovaStore } from '../../lib/store'

export default function LoginScreen() {
  const router = useRouter()
  const setDemoSession = useNovaStore((s) => s.setDemoSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onLogin = async () => {
    setError('')
    setLoading(true)
    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Enter email and password')
      }

      if (isSupabaseConfigured) {
        const supabase = getSupabase()!
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (err) throw err
        useNovaStore.setState({
          demoMode: false,
          sessionUserId: data.user?.id || null,
          sessionEmail: data.user?.email || email.trim(),
        })
      } else {
        setDemoSession(email.trim())
      }
      router.replace('/tasks')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
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
        <View style={styles.hero}>
          <Text style={styles.brand}>{brand.name}</Text>
          <Text style={styles.tagline}>{brand.tagline}</Text>
          <Text style={styles.sub}>Tell Wahrly what matters today — it becomes a clear plan.</Text>
        </View>

        <View style={styles.card}>
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
            onPress={onLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        <Link href="/signup" style={styles.link}>
          Create an account
        </Link>

        <Pressable
          accessibilityRole="button"
          style={styles.demoBtn}
          onPress={() => {
            setDemoSession('demo@wahrly.local', 'Friend')
            router.replace('/welcome')
          }}
        >
          <Text style={styles.demoText}>Continue in demo mode</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  hero: { gap: 10, marginBottom: 4 },
  brand: {
    color: colors.text,
    fontSize: 56,
    lineHeight: 60,
    fontFamily: fonts.brand,
    letterSpacing: -1,
  },
  tagline: {
    color: colors.accentStrong,
    fontSize: 18,
    fontFamily: fonts.brandItalic,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
  },
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
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only
    cursor: 'pointer',
  },
  btnText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  error: { color: colors.danger, fontFamily: fonts.body },
  link: {
    color: colors.accentStrong,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  demoBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    // @ts-expect-error web-only
    cursor: 'pointer',
  },
  demoText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 14 },
})
