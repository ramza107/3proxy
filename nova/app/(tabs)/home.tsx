import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AIInput } from '../../components/AIInput'
import { BottomSheet } from '../../components/BottomSheet'
import { BrandMark } from '../../components/BrandMark'
import { CalendarBrief } from '../../components/CalendarBrief'
import { DailyPlan } from '../../components/DailyPlan'
import { HomeSection } from '../../components/HomeSection'
import { InboxBrief } from '../../components/InboxBrief'
import { MeetingAlerts } from '../../components/MeetingAlerts'
import { MorningBrief } from '../../components/MorningBrief'
import { PromisesBrief } from '../../components/PromisesBrief'
import { QuickActionsSheet } from '../../components/QuickActionsSheet'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { TaskEditor } from '../../components/TaskEditor'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { t as translate } from '../../lib/i18n'
import { parseHm } from '../../lib/notifications'
import { sortTasks, todayISO, useNovaStore } from '../../lib/store'
import { resolveDayWindow } from '../../lib/scheduleDay'
import { useT } from '../../lib/useT'
import {
  deleteTask,
  organizeMyDay,
  refreshTasks,
  sendNovaMessage,
  toggleTaskCompleted,
  updateTaskFields,
} from '../../services/ai'
import type { Task } from '../../types'
import type { CalendarEvent } from '../../types'

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'home.goodMorning'
  if (h < 18) return 'home.goodAfternoon'
  return 'home.goodEvening'
}

function shouldOfferEveningClear(eveningTime: string, lastClear: string | null) {
  const today = todayISO()
  if (lastClear === today) return false
  const hm = parseHm(eveningTime)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const startMin = hm ? Math.max(18 * 60, hm.hour * 60 + hm.minute - 120) : 18 * 60
  return nowMin >= startMin
}

/** Morning brief: after brief time (or from 5:00), until noon, once per day.
 *  `force` bypasses the clock (Settings / Quick actions). */
function shouldOfferMorningBrief(
  enabled: boolean,
  briefTime: string,
  lastBrief: string | null,
  force: boolean,
) {
  if (!enabled && !force) return false
  if (force) return true
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
  const t = useT()
  const language = useNovaStore((s) => s.settings.language)
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const tasks = useNovaStore((s) => s.tasks)
  const settings = useNovaStore((s) => s.settings)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const forceMorningBrief = useNovaStore((s) => s.forceMorningBrief)
  const setForceMorningBrief = useNovaStore((s) => s.setForceMorningBrief)
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
  const [quickOpen, setQuickOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

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
    forceMorningBrief,
  )

  const showEveningClear =
    settings.eveningClearEnabled !== false &&
    shouldOfferEveningClear(settings.eveningClearTime || '21:30', settings.lastEveningClearDate)

  const dismissMorningBrief = () => {
    setForceMorningBrief(false)
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
            <Text style={styles.pageTitle} numberOfLines={1}>
              {t('tabs.home')}
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setQuickOpen(true)} hitSlop={8} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>···</Text>
            </Pressable>
          </View>
          <Text style={styles.hello}>
            {translate(language, greetingKey())}, {name}
          </Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>

          {showEveningClear ? (
            <Pressable style={styles.eveningCard} onPress={() => router.push('/evening')}>
              <View style={styles.eveningNode} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eveningTitle}>{t('home.eveningClear')}</Text>
                <Text style={styles.eveningSub}>
                  {t('home.closeToday')} · {todayTasks.length} open
                </Text>
              </View>
              <Text style={styles.eveningCta}>{t('home.open')}</Text>
            </Pressable>
          ) : null}

          <DailyPlan
            tasks={todayTasks}
            events={calendarEvents}
            onToggle={(task) => toggleTaskCompleted(task)}
            onEdit={(task) => setEditing(task)}
            workdayStart={dayWindow.start}
            workdayEnd={dayWindow.end}
            dayKind={dayWindow.kind}
            onPlanDay={onPlanDay}
            planning={planning}
          />
          <Text style={styles.editHint}>{t('home.editHint')}</Text>

          <Text style={styles.groupLabel}>{t('home.fromGoogle')}</Text>
          <CalendarBrief
            userId={userId}
            onEvents={(ev) => setCalendarEvents(ev.filter((e) => e.calendar !== 'demo'))}
          />
          <InboxBrief userId={userId} enabled={emailDigestEnabled} />
          <MeetingAlerts userId={userId} alertsEnabled={meetingEmailAlertsEnabled} />
          <PromisesBrief userId={userId} autoCreate={emailPromisesAutoEnabled} />

          <HomeSection title={t('home.askWahrly')} emphasize>
            <Text style={styles.prompt}>{t('home.askPrompt')}</Text>
            <AIInput loading={loading} onSend={onSend} />
            <Pressable style={styles.ask} onPress={() => router.push('/chat')}>
              <Text style={styles.askText}>{t('home.openChat')}</Text>
            </Pressable>
          </HomeSection>
        </ScrollView>

        <SoftPressable style={styles.fab} onPress={() => setQuickOpen(true)}>
          <Text style={styles.fabText}>+</Text>
        </SoftPressable>
      </SafeAreaView>

      <BottomSheet
        visible={showMorningBrief}
        onClose={dismissMorningBrief}
        title="Morning brief"
      >
        <MorningBrief
          embedded
          tasks={todayTasks}
          workdayStart={dayWindow.start}
          workdayEnd={dayWindow.end}
          weatherCity={settings.weatherCity}
          planning={planning}
          onPlanDay={onPlanDay}
          onDismiss={dismissMorningBrief}
        />
      </BottomSheet>

      <QuickActionsSheet
        visible={quickOpen}
        onClose={() => setQuickOpen(false)}
        planning={planning}
        showEvening={showEveningClear}
        onPlanDay={onPlanDay}
        onOpenChat={() => router.push('/chat')}
        onOpenTasks={() => router.push('/tasks')}
        onOpenBills={() => router.push('/bills')}
        onOpenSettings={() => router.push('/settings')}
        onOpenEvening={() => router.push('/evening')}
        onOpenMorning={() => {
          updateSettings({ lastMorningBriefDate: null })
          setForceMorningBrief(true)
        }}
      />

      <TaskEditor
        task={editing}
        visible={!!editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) updateTaskFields(editing, patch)
        }}
        onComplete={() => {
          if (editing) {
            toggleTaskCompleted(editing)
            setEditing(null)
          }
        }}
        onDelete={() => {
          if (editing) deleteTask(editing.id)
          setEditing(null)
        }}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 96,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    alignSelf: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 },
  pageTitle: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 28,
    letterSpacing: -0.6,
    flexShrink: 0,
  },
  brandMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCardSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  menuBtnText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    marginTop: -6,
  },
  hello: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
    letterSpacing: -0.2,
    marginTop: 4,
  },
  date: {
    color: colors.textDim,
    fontSize: 14,
    fontFamily: fonts.body,
    marginBottom: 4,
  },
  eveningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  eveningNode: {
    width: 12,
    height: 12,
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
  editHint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  groupLabel: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: -4,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  prompt: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.bodyMedium },
  ask: { alignSelf: 'flex-start', marginTop: 2 },
  askText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2A32',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    marginTop: -2,
  },
})
