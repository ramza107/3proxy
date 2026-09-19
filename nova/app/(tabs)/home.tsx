import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AIInput } from '../../components/AIInput'
import { DailyPlan } from '../../components/DailyPlan'
import { InboxBrief } from '../../components/InboxBrief'
import { MeetingAlerts } from '../../components/MeetingAlerts'
import { PromisesBrief } from '../../components/PromisesBrief'
import { Screen } from '../../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { parseHm } from '../../lib/notifications'
import { sortTasks, todayISO, useNovaStore } from '../../lib/store'
import { resolveDayWindow } from '../../lib/scheduleDay'
import { organizeMyDay, refreshTasks, sendNovaMessage, toggleTaskCompleted } from '../../services/ai'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Show Evening Clear from late afternoon until end of day, until finished today. */
function shouldOfferEveningClear(eveningTime: string, lastClear: string | null) {
  const today = todayISO()
  if (lastClear === today) return false
  const hm = parseHm(eveningTime)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const startMin = hm ? Math.max(18 * 60, hm.hour * 60 + hm.minute - 120) : 18 * 60
  return nowMin >= startMin
}

export default function HomeScreen() {
  const router = useRouter()
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const tasks = useNovaStore((s) => s.tasks)
  const settings = useNovaStore((s) => s.settings)
  const userId = useNovaStore((s) => s.sessionUserId)
  const emailDigestEnabled = useNovaStore((s) => s.settings.emailDigestEnabled !== false)
  const emailPromisesAutoEnabled = useNovaStore(
    (s) => s.settings.emailPromisesAutoEnabled === true,
  )
  const meetingEmailAlertsEnabled = useNovaStore(
    (s) => s.settings.meetingEmailAlertsEnabled !== false,
  )
  const [loading, setLoading] = useState(false)
  const [planning, setPlanning] = useState(false)

  useEffect(() => {
    if (userId) refreshTasks(userId).catch(() => undefined)
  }, [userId])

  const day = todayISO()
  const dayWindow = useMemo(
    () => resolveDayWindow(settings, day),
    [settings, day],
  )
  const todayTasks = useMemo(
    () => sortTasks(tasks.filter((t) => !t.completed && (t.date === day || !t.date))),
    [tasks, day],
  )

  const showEveningClear =
    settings.eveningClearEnabled !== false &&
    shouldOfferEveningClear(settings.eveningClearTime || '21:30', settings.lastEveningClearDate)

  const onSend = async (text: string) => {
    setLoading(true)
    try {
      await sendNovaMessage(text)
      router.push('/chat')
    } catch (e) {
      Alert.alert(brand.name, e instanceof Error ? e.message : 'Could not reach AI server')
    } finally {
      setLoading(false)
    }
  }

  const onPlanDay = async () => {
    setPlanning(true)
    try {
      const res = await organizeMyDay({ includeUndated: true })
      Alert.alert('Smart day', res.reply)
    } catch (e) {
      Alert.alert(brand.name, e instanceof Error ? e.message : 'Could not plan the day')
    } finally {
      setPlanning(false)
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brandMark}>{brand.name}</Text>
          <Text style={styles.hello}>{greeting()}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          <Text style={styles.name}>Hi {name}</Text>

          {showEveningClear ? (
            <Pressable style={styles.eveningCard} onPress={() => router.push('/evening')}>
              <Text style={styles.eveningEyebrow}>Ritual</Text>
              <Text style={styles.eveningTitle}>Evening Clear</Text>
              <Text style={styles.eveningSub}>
                Close today, shape tomorrow — {todayTasks.length} open now
              </Text>
              <Text style={styles.eveningCta}>Start →</Text>
            </Pressable>
          ) : null}

          <DailyPlan
            tasks={todayTasks}
            onToggle={(task) => toggleTaskCompleted(task)}
            workdayStart={dayWindow.start}
            workdayEnd={dayWindow.end}
            dayKind={dayWindow.kind}
            onPlanDay={onPlanDay}
            planning={planning}
          />

          <InboxBrief userId={userId} enabled={emailDigestEnabled} />

          <MeetingAlerts userId={userId} alertsEnabled={meetingEmailAlertsEnabled} />

          <PromisesBrief userId={userId} autoCreate={emailPromisesAutoEnabled} />

          <Pressable style={styles.ask} onPress={() => router.push('/chat')}>
            <Text style={styles.askText}>Ask Wahrly</Text>
          </Pressable>

          <View style={styles.divider} />
          <Text style={styles.prompt}>What do you need to do?</Text>
          <AIInput loading={loading} onSend={onSend} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  brandMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  hello: {
    color: colors.text,
    fontSize: 32,
    fontFamily: fonts.brand,
    letterSpacing: -0.6,
  },
  date: { color: colors.textMuted, fontSize: 15, fontFamily: fonts.body, marginTop: -6 },
  name: { color: colors.textDim, marginBottom: 4, fontFamily: fonts.body },
  eveningCard: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 4,
  },
  eveningEyebrow: {
    color: 'rgba(247,251,250,0.55)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eveningTitle: {
    color: colors.textOnAccent,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.4,
  },
  eveningSub: {
    color: 'rgba(247,251,250,0.72)',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  eveningCta: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    marginTop: 4,
  },
  ask: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 18,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  prompt: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.bodyMedium },
})
