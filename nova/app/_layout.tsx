import {
  SourceSerif4_600SemiBold,
  SourceSerif4_600SemiBold_Italic,
  useFonts as useSourceSerif,
} from '@expo-google-fonts/source-serif-4'
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_700Bold,
  useFonts as useSourceSans,
} from '@expo-google-fonts/source-sans-3'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, AppState, Platform, View } from 'react-native'
import { colors } from '../constants/theme'
import { AnalyticsEvents, identify as analyticsIdentify, track } from '../lib/analytics'
import {
  getNotifications,
  syncBillReminders,
  syncDailyRitualNotifications,
  syncImportantDateReminders,
  syncLifeAdminReminders,
  syncPromiseDueReminders,
} from '../lib/notifications'
import { identifyUser, initMonitoring, wrapRoot } from '../lib/monitoring'
import { isSupabaseConfigured, getSupabase } from '../lib/supabase'
import { useNovaStore } from '../lib/store'

initMonitoring()

const RootView =
  Platform.OS === 'web'
    ? View
    : require('react-native-gesture-handler').GestureHandlerRootView

function RootLayout() {
  const [serifLoaded] = useSourceSerif({
    SourceSerif4_600SemiBold,
    SourceSerif4_600SemiBold_Italic,
  })
  const [sansLoaded] = useSourceSans({
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_700Bold,
  })
  const fontsReady = serifLoaded && sansLoaded

  const router = useRouter()
  const segments = useSegments()
  const hydrated = useNovaStore((s) => s.hydrated)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)
  const onboardingComplete = useNovaStore((s) => s.settings.onboardingComplete)
  const settings = useNovaStore((s) => s.settings)
  const tasks = useNovaStore((s) => s.tasks)
  const bills = useNovaStore((s) => s.bills)
  const lifeAdmin = useNovaStore((s) => s.lifeAdmin)
  const importantDates = useNovaStore((s) => s.importantDates)
  const setDemoSession = useNovaStore((s) => s.setDemoSession)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const clearSession = useNovaStore((s) => s.clearSession)
  const sessionEmail = useNovaStore((s) => s.sessionEmail)

  useEffect(() => {
    if (!hydrated || !fontsReady) return
    track(AnalyticsEvents.appOpen, {
      onboarded: onboardingComplete,
      signed_in: Boolean(sessionUserId),
    })
  }, [hydrated, fontsReady]) // once per cold start after ready

  useEffect(() => {
    if (!sessionUserId) {
      identifyUser(null)
      return
    }
    identifyUser(sessionUserId, sessionEmail)
    analyticsIdentify(sessionUserId, {
      email: sessionEmail,
      language: settings.language,
    })
  }, [sessionUserId, sessionEmail, settings.language])

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
    // OAuth return (Google / Apple) before session is written to the store.
    const inAuthCallback = root === 'auth'

    // Privacy Policy must be reachable without login (Google OAuth verification).
    if (isPublic || inAuthCallback) return

    if (!sessionUserId) {
      if (!inAuth) router.replace('/login')
      return
    }

    if (!onboardingComplete) {
      if (!inOnboarding) router.replace('/welcome')
      return
    }

    if (inAuth || inOnboarding || root === undefined) {
      router.replace('/tasks')
    }
  }, [hydrated, fontsReady, sessionUserId, onboardingComplete, segments, router])

  // Keep ritual + bill + dates local notifications in sync with store
  useEffect(() => {
    if (!hydrated || !sessionUserId || !onboardingComplete) return
    syncDailyRitualNotifications(settings, tasks).catch(() => undefined)
    syncBillReminders(bills, settings).catch(() => undefined)
    syncPromiseDueReminders(tasks, settings).catch(() => undefined)
    syncImportantDateReminders(importantDates, settings).catch(() => undefined)
    syncLifeAdminReminders(lifeAdmin, settings).catch(() => undefined)
    import('../lib/widgetSync')
      .then((m) => m.refreshWidgetSnapshot())
      .catch(() => undefined)
  }, [
    hydrated,
    sessionUserId,
    onboardingComplete,
    tasks,
    bills,
    lifeAdmin,
    importantDates,
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
    settings.promiseRemindDayBefore,
    settings.language,
  ])

  // Re-push widget snapshot whenever the app returns to foreground.
  useEffect(() => {
    if (Platform.OS !== 'ios') return
    if (!hydrated || !sessionUserId || !onboardingComplete) return
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      import('../lib/widgetSync')
        .then((m) => m.refreshWidgetSnapshot())
        .catch(() => undefined)
    })
    return () => sub.remove()
  }, [hydrated, sessionUserId, onboardingComplete])

  // Evening Clear / Morning brief / Bills notification → open ritual or bills
  useEffect(() => {
    if (!hydrated || !fontsReady || !sessionUserId || !onboardingComplete) return
    if (Platform.OS === 'web') return
    let sub: { remove: () => void } | undefined
    const setForceMorningBrief = useNovaStore.getState().setForceMorningBrief
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
          const billId = typeof data.billId === 'string' ? data.billId : ''
          router.push(billId ? { pathname: '/bills', params: { billId } } : '/bills')
          return
        }
        if (data.kind === 'important_date') {
          router.push('/dates')
          return
        }
        if (data.kind === 'life_admin') {
          router.push('/life')
          return
        }
        if (data.kind === 'task' || data.taskId) {
          const taskId = typeof data.taskId === 'string' ? data.taskId : ''
          router.push(taskId ? { pathname: '/tasks', params: { taskId } } : '/tasks')
          return
        }
        if (data.kind === 'meeting') {
          router.push('/home')
          return
        }
        if (data.kind === 'morning' || data.openMorning === true) {
          // Force the sheet even if the clock window / once-per-day gate already passed.
          useNovaStore.getState().updateSettings({ lastMorningBriefDate: null })
          setForceMorningBrief(true)
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

export default wrapRoot(RootLayout)
