import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AIInput } from '../../components/AIInput'
import { BrandMark } from '../../components/BrandMark'
import { DailyPlan } from '../../components/DailyPlan'
import { InboxBrief } from '../../components/InboxBrief'
import { MeetingAlerts } from '../../components/MeetingAlerts'
import { MorningBrief } from '../../components/MorningBrief'
import { PromisesBrief } from '../../components/PromisesBrief'
import { Screen } from '../../components/Screen'
import { brand, colors, fonts, spacing } from '../../constants/theme'
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

/** Morning brief on Home: after brief time (or from 5:00), until noon, once per day. */
function shouldOfferMorningBrief(
  enabled: boolean,
  briefTime: string,
  lastBrief: string | null,
) {
  if (!enabled) return false
  const today = todayISO()
  if (lastBrief === today) return false
  const hour = new Date().getHours()
  if (hour >= 12) return false
  const hm = parseHm(briefTime || '08:00')
  const nowMin = hour * 60 + new Date().getMinutes()
  const startMin = hm ? Math.max(5 * 60, hm.hour * 60 + hm.minute - 60) : 5 * 60
  return nowMin >= startMin
}

export default function HomeScreen() {
  const router = useRouter()
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const tasks = useNovaStore((s) => s.tasks)
  const settings = useNovaStore((s) => s.settings)
  const updateSettings = useNovaStore((s) => s.updateSettings)
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

  const showMorningBrief = shouldOfferMorningBrief(
    settings.morningBriefEnabled !== false,
    settings.morningBriefTime || '08:00',
    settings.lastMorningBriefDate ?? null,
  )

  const showEveningClear =
    settings.eveningClearEnabled !== false &&
    shouldOfferEveningClear(settings.eveningClearTime || '21:30', settings.lastEveningClearDate)

  const dismissMorningBrief = () => {
    updateSettings({ lastMorningBriefDate: todayISO() })
  }

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
      if (showMorningBrief) dismissMorningBrief()
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
            <BrandMark size={36} />
            <Text style={styles.brandMark}>{brand.name}</Text>
          </View>
          <Text style={styles.hello}>
            {greeting()}, {name}
          </Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>

          {showMorningBrief ? (
            <MorningBrief
              tasks={todayTasks}
              workdayStart={dayWindow.start}
              workdayEnd={dayWindow.end}
              weatherCity={settings.weatherCity}
              planning={planning}
              onPlanDay={onPlanDay}
              onDismiss={dismissMorningBrief}
            />
          ) : null}

          {showEveningClear ? (
            <Pressable style={styles.eveningRow} onPress={() => router.push('/evening')}>
              <View style={styles.eveningNode} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eveningTitle}>Evening Clear</Text>
                <Text style={styles.eveningSub}>
                  Close today · {todayTasks.length} open
                </Text>
              </View>
              <Text style={styles.eveningCta}>Open</Text>
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

          <View style={styles.mailBlock}>
            <InboxBrief userId={userId} enabled={emailDigestEnabled} />
            <MeetingAlerts userId={userId} alertsEnabled={meetingEmailAlertsEnabled} />
            <PromisesBrief userId={userId} autoCreate={emailPromisesAutoEnabled} />
          </View>

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
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: 48,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    alignSelf: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  brandMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  hello: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
    letterSpacing: -0.2,
    marginTop: 8,
  },
  date: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: fonts.body,
    marginBottom: 8,
  },
  eveningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 4,
  },
  eveningNode: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  eveningTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  eveningSub: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 1,
  },
  eveningCta: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  mailBlock: {
    marginTop: spacing.sm,
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  composer: {
    marginTop: spacing.md,
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
