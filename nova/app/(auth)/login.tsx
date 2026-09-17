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
import { colors, radii, spacing } from '../../constants/theme'
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
      router.replace('/(tabs)/home')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>NOVA</Text>
        <Text style={styles.sub}>Your AI life assistant</Text>
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
        <Pressable style={styles.btn} onPress={onLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#0B0D12" /> : <Text style={styles.btnText}>Sign in</Text>}
        </Pressable>
        <Text style={styles.hint}>
          {isSupabaseConfigured
            ? 'Connected to Supabase'
            : 'Demo mode: any email/password works locally'}
        </Text>
      </View>

      <Link href="/(auth)/signup" style={styles.link}>
        Create an account
      </Link>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  hero: { gap: 8 },
  brand: { color: colors.text, fontSize: 42, fontWeight: '800', letterSpacing: 1 },
  sub: { color: colors.textMuted, fontSize: 16 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#0B0D12', fontWeight: '800', fontSize: 16 },
  error: { color: colors.danger },
  hint: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 4 },
  link: { color: colors.accentStrong, textAlign: 'center', fontWeight: '600', fontSize: 15 },
})
