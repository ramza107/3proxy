import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { colors } from '../constants/theme'
import { isSupabaseConfigured, getSupabase } from '../lib/supabase'
import { useNovaStore } from '../lib/store'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const hydrated = useNovaStore((s) => s.hydrated)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)
  const onboardingComplete = useNovaStore((s) => s.settings.onboardingComplete)
  const setDemoSession = useNovaStore((s) => s.setDemoSession)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const clearSession = useNovaStore((s) => s.clearSession)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const supabase = getSupabase()
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      if (session?.user) {
        setDemoSession(session.user.email || 'user@nova.app', session.user.user_metadata?.name)
        useNovaStore.setState({
          demoMode: false,
          sessionUserId: session.user.id,
        })
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        useNovaStore.setState({
          demoMode: false,
          sessionUserId: session.user.id,
          sessionEmail: session.user.email || null,
        })
        if (session.user.user_metadata?.name) {
          updateSettings({ name: session.user.user_metadata.name })
        }
      } else {
        clearSession()
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [clearSession, setDemoSession, updateSettings])

  useEffect(() => {
    if (!hydrated) return
    const inAuth = segments[0] === '(auth)'
    const inOnboarding = segments[0] === '(onboarding)'

    if (!sessionUserId) {
      if (!inAuth && !inOnboarding) router.replace('/(auth)/login')
      return
    }

    if (!onboardingComplete) {
      if (!inOnboarding) router.replace('/(onboarding)/welcome')
      return
    }

    if (inAuth || inOnboarding || segments[0] === undefined) {
      router.replace('/(tabs)/home')
    }
  }, [hydrated, sessionUserId, onboardingComplete, segments, router])

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </GestureHandlerRootView>
  )
}
