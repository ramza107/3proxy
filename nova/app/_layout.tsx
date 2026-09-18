import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces'
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDmSans,
} from '@expo-google-fonts/dm-sans'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'
import { colors } from '../constants/theme'
import { isSupabaseConfigured, getSupabase } from '../lib/supabase'
import { useNovaStore } from '../lib/store'

const RootView =
  Platform.OS === 'web'
    ? View
    : require('react-native-gesture-handler').GestureHandlerRootView

export default function RootLayout() {
  const [frauncesLoaded] = useFraunces({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  })
  const [dmLoaded] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  })
  const fontsReady = frauncesLoaded && dmLoaded

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
        setDemoSession(session.user.email || 'user@wahrly.app', session.user.user_metadata?.name)
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
      } else if (!useNovaStore.getState().demoMode) {
        clearSession()
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [clearSession, setDemoSession, updateSettings])

  useEffect(() => {
    if (!hydrated || !fontsReady) return
    const root = segments[0]
    const inAuth = root === '(auth)'
    const inOnboarding = root === '(onboarding)'
    const isPublic = root === 'privacy'

    // Privacy Policy must be reachable without login (Google OAuth verification).
    if (isPublic) return

    if (!sessionUserId) {
      if (!inAuth) router.replace('/login')
      return
    }

    if (!onboardingComplete) {
      if (!inOnboarding) router.replace('/welcome')
      return
    }

    if (inAuth || inOnboarding || root === undefined) {
      router.replace('/home')
    }
  }, [hydrated, fontsReady, sessionUserId, onboardingComplete, segments, router])

  if (!hydrated || !fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <RootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </RootView>
  )
}
