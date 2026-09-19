import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AIInput } from '../../components/AIInput'
import { BrandMark } from '../../components/BrandMark'
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
  const dayWindow = useMemo(() => resolveDayWindow(settings, day), [settings, day])
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
          <View style={styles.brandRow}>
            <BrandMark size={40} />
            <Text style={styles.brandMark}>{brand.name}</Text>
          </View>
          <Text style={styles.hello}>{greeting()}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          <Text style={styles.name}>Hi {name}</Text>

          {showEveningClear ? (
            <Pressable style={styles.eveningCard} onPress={() => router.push('/evening')}>
              <View style={styles.eveningNode} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eveningEyebrow}>Evening node</Text>
                <Text style={styles.eveningTitle}>Evening Clear</Text>
                <Text style={styles.eveningSub}>
                  Close today, shape tomorrow — {todayTasks.length} open
                </Text>
              </View>
              <Text style={styles.eveningCta}>→</Text>
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

          <View style={styles.composer}>
            <Text style={styles.prompt}>What do you need to do?</Text>
            <AIInput loading={loading} onSend={onSend} />
            <Pressable style={styles.ask} onPress={() => router.push('/chat')}>
              <Text style={styles.askText}>Open chat</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 48 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  hello: {
    color: colors.text,
    fontSize: 36,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  date: { color: colors.textMuted, fontSize: 15, fontFamily: fonts.body, marginTop: -8 },
  name: { color: colors.textDim, fontFamily: fonts.body, marginBottom: 4 },
  eveningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  eveningNode: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  eveningEyebrow: {
    color: 'rgba(247,251,250,0.5)',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eveningTitle: {
    color: colors.textOnAccent,
    fontFamily: fonts.brand,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  eveningSub: {
    color: 'rgba(247,251,250,0.7)',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  eveningCta: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 20 },
  composer: {
    marginTop: 8,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 10,
  },
  prompt: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.bodyMedium },
  ask: { alignSelf: 'flex-start' },
  askText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
})
