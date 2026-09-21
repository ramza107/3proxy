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
import {
  getNotifications,
  syncBillReminders,
  syncDailyRitualNotifications,
} from '../lib/notifications'
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
  const settings = useNovaStore((s) => s.settings)
  const tasks = useNovaStore((s) => s.tasks)
  const bills = useNovaStore((s) => s.bills)
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

  // Keep ritual + bill local notifications in sync with store
  useEffect(() => {
    if (!hydrated || !sessionUserId || !onboardingComplete) return
    syncDailyRitualNotifications(settings, tasks).catch(() => undefined)
    syncBillReminders(bills, settings).catch(() => undefined)
  }, [
    hydrated,
    sessionUserId,
    onboardingComplete,
    tasks,
    bills,
    settings.notificationsEnabled,
    settings.morningBriefEnabled,
    settings.morningBriefTime,
    settings.eveningClearEnabled,
    settings.eveningClearTime,
    settings.emailDigestEnabled,
    settings.billRemindersEnabled,
    settings.billRemindLeadDays,
    settings.billRemindCadence,
    settings.billRemindTime,
  ])

  // Evening Clear / Morning brief / Bills notification → open ritual or bills
  useEffect(() => {
    if (!hydrated || !fontsReady || !sessionUserId || !onboardingComplete) return
    if (Platform.OS === 'web') return
    let sub: { remove: () => void } | undefined
    ;(async () => {
      const NotificationsMod = await getNotifications()
      if (!NotificationsMod) return
      const go = (data: Record<string, unknown> | undefined) => {
        if (!data) return
        if (data.kind === 'evening' || data.route === '/evening') {
          router.push('/evening')
          return
        }
        if (data.kind === 'bill') {
          router.push('/bills')
          return
        }
        if (data.kind === 'morning') {
          router.push('/home')
        }
      }
      const last = await NotificationsMod.getLastNotificationResponseAsync()
      go(last?.notification?.request?.content?.data as Record<string, unknown> | undefined)
      sub = NotificationsMod.addNotificationResponseReceivedListener((response) => {
        go(response.notification.request.content.data as Record<string, unknown> | undefined)
      })
    })()
    return () => sub?.remove()
  }, [hydrated, fontsReady, sessionUserId, onboardingComplete, router])

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
