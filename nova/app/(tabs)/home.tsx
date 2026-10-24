import { format, addDays } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BottomSheet } from '../../components/BottomSheet'
import { BrandMark } from '../../components/BrandMark'
import { MorningBrief } from '../../components/MorningBrief'
import { PlanDaySheet } from '../../components/PlanDaySheet'
import { SoftPressable } from '../../components/SoftPressable'
import { WeeklyBrief } from '../../components/WeeklyBrief'
import { Screen } from '../../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { AnalyticsEvents, track } from '../../lib/analytics'
import { t as translate } from '../../lib/i18n'
import { dateLocale } from '../../lib/dateLocale'
import { parseHm } from '../../lib/notifications'
import { sortTasks, todayISO, useNovaStore } from '../../lib/store'
import { resolveDayWindow } from '../../lib/scheduleDay'
import { isMonday } from '../../lib/weekRange'
import { canUseMorningBrief, canUsePlanDay, useIsPro } from '../../lib/pro'
import { useT } from '../../lib/useT'
import {
  deleteTask,
  organizeMyDay,
  refreshTasks,
  undoLastPlanDay,
  updateTaskFields,
} from '../../services/ai'

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
 *  `force` bypasses the clock (Settings / menu tile). */
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

type Tone = 'ink' | 'mist' | 'teal' | 'soft'

type Tile = {
  key: string
  mark: string
  label: string
  onPress: () => void
  tone: Tone
  disabled?: boolean
}

/**
 * Home is the product map: hero Wahrly + square tiles for every space.
 * Timeline / briefs live on Tasks and modal rituals — not dumped here.
 */
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
  const forceWeeklyBrief = useNovaStore((s) => s.forceWeeklyBrief)
  const setForceWeeklyBrief = useNovaStore((s) => s.setForceWeeklyBrief)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const userId = useNovaStore((s) => s.sessionUserId)
  const isProUser = useIsPro()
  const [planning, setPlanning] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [weekOpen, setWeekOpen] = useState(false)

  useEffect(() => {
    if (userId) refreshTasks(userId).catch(() => undefined)
  }, [userId])

  const day = todayISO()
  const dayWindow = useMemo(() => resolveDayWindow(settings, day), [settings, day])
  const todayTasks = useMemo(
    () => sortTasks(tasks.filter((x) => !x.completed && (x.date === day || !x.date))),
    [tasks, day],
  )

  const showMorningBrief =
    canUseMorningBrief() &&
    shouldOfferMorningBrief(
      settings.morningBriefEnabled !== false,
      settings.morningBriefTime || '08:00',
      settings.lastMorningBriefDate ?? null,
      forceMorningBrief,
    )

  const showWeeklyBrief =
    !showMorningBrief &&
    settings.isPro === true &&
    (forceWeeklyBrief ||
      (settings.weeklyBriefEnabled !== false &&
        isMonday(day) &&
        settings.lastWeeklyBriefDate !== day &&
        shouldOfferMorningBrief(true, settings.morningBriefTime || '08:00', null, false)))

  const showEveningClear =
    settings.eveningClearEnabled !== false &&
    shouldOfferEveningClear(settings.eveningClearTime || '21:30', settings.lastEveningClearDate)

  const dismissMorningBrief = () => {
    setForceMorningBrief(false)
    updateSettings({ lastMorningBriefDate: todayISO() })
  }

  const dismissWeeklyBrief = () => {
    setForceWeeklyBrief(false)
    setWeekOpen(false)
    updateSettings({ lastWeeklyBriefDate: todayISO() })
  }

  useEffect(() => {
    if (showWeeklyBrief || forceWeeklyBrief) setWeekOpen(true)
  }, [showWeeklyBrief, forceWeeklyBrief])

  const requirePlanDayPro = () => {
    const untimed = todayTasks.filter((task) => !task.time).length
    const body =
      untimed > 0
        ? t.tf('pro.planDayUpsell', { n: untimed })
        : t('pro.planDayUpsellEmpty')
    Alert.alert(t('pro.title'), body, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('pro.subscribe'), onPress: () => router.push('/settings') },
    ])
  }

  const openPlanSheet = () => {
    if (!canUsePlanDay()) {
      requirePlanDayPro()
      return
    }
    const hadModal = showMorningBrief || weekOpen
    if (showMorningBrief) dismissMorningBrief()
    if (weekOpen) dismissWeeklyBrief()
    if (hadModal) {
      setTimeout(() => setPlanOpen(true), 280)
    } else {
      setPlanOpen(true)
    }
  }

  const onArrangeDay = async (skipTaskIds: string[] = []) => {
    setPlanning(true)
    try {
      const res = await organizeMyDay({ includeUndated: true, skipTaskIds })
      void track(AnalyticsEvents.planDay)
      if (showMorningBrief) dismissMorningBrief()
      setPlanOpen(false)
      Alert.alert('Smart day', res.reply, [
        { text: 'OK', style: 'cancel' },
        {
          text: t('home.undoPlan'),
          onPress: () => {
            void undoLastPlanDay().then((n) => {
              if (n > 0) Alert.alert(t('home.undoPlan'), t.tf('home.undoPlanDone', { n }))
            })
          },
        },
      ])
    } catch (e) {
      Alert.alert(brand.name, e instanceof Error ? e.message : 'Could not plan the day')
    } finally {
      setPlanning(false)
    }
  }

  const tomorrowISO = () => format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const tiles: Tile[] = [
    {
      key: 'tasks',
      mark: 'T',
      label: t('tabs.tasks'),
      onPress: () => router.push('/tasks'),
      tone: 'ink',
    },
    {
      key: 'chat',
      mark: 'C',
      label: t('tabs.chat'),
      onPress: () => router.push('/chat'),
      tone: 'teal',
    },
    {
      key: 'plan',
      mark: 'P',
      label: planning ? t('home.planning') : t('home.planDay'),
      onPress: openPlanSheet,
      tone: 'mist',
      disabled: planning,
    },
    {
      key: 'bills',
      mark: 'B',
      label: t('quick.bills'),
      onPress: () => router.push('/bills'),
      tone: 'soft',
    },
    {
      key: 'dates',
      mark: 'D',
      label: t('quick.dates'),
      onPress: () => router.push('/dates'),
      tone: 'mist',
    },
    {
      key: 'shopping',
      mark: 'S',
      label: t('quick.shopping'),
      onPress: () => router.push('/shopping'),
      tone: 'soft',
    },
    {
      key: 'life',
      mark: 'L',
      label: t('quick.life'),
      onPress: () => router.push('/life'),
      tone: 'teal',
    },
    {
      key: 'news',
      mark: 'N',
      label: t('tabs.news'),
      onPress: () => router.push('/news'),
      tone: 'mist',
    },
  ]

  if (isProUser) {
    tiles.push({
      key: 'invest',
      mark: 'I',
      label: t('quick.invest'),
      onPress: () => router.push('/invest'),
      tone: 'soft',
    })
    tiles.push({
      key: 'morning',
      mark: 'M',
      label: t('quick.morning'),
      onPress: () => {
        updateSettings({ lastMorningBriefDate: null })
        setForceMorningBrief(true)
      },
      tone: 'teal',
    })
    tiles.push({
      key: 'weekly',
      mark: 'W',
      label: t('quick.weekly'),
      onPress: () => {
        updateSettings({ lastWeeklyBriefDate: null })
        setForceWeeklyBrief(true)
      },
      tone: 'mist',
    })
  }

  if (showEveningClear) {
    tiles.push({
      key: 'evening',
      mark: 'E',
      label: t('home.eveningClear'),
      onPress: () => router.push('/evening'),
      tone: 'ink',
    })
  }

  tiles.push({
    key: 'settings',
    mark: '◎',
    label: t('tabs.settings'),
    onPress: () => router.push('/settings'),
    tone: 'soft',
  })

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(480)} style={styles.hero}>
            <View style={styles.markGlow}>
              <BrandMark size={40} color={colors.accentStrong} />
            </View>
            <Text style={styles.brandWord} accessibilityRole="header">
              {brand.name}
            </Text>
            <Text style={styles.hello}>
              {translate(language, greetingKey())}, {name}
            </Text>
            <Text style={styles.date}>
              {format(new Date(), 'EEEE, d MMMM', { locale: dateLocale(language) })}
            </Text>
          </Animated.View>

          <View style={styles.grid}>
            {tiles.map((tile, i) => (
              <Animated.View
                key={tile.key}
                entering={FadeInDown.delay(60 + Math.min(i, 8) * 45)
                  .duration(380)
                  .springify()
                  .damping(18)}
                style={styles.tileWrap}
              >
                <SoftPressable
                  style={[styles.tileShell, tile.disabled && styles.tileDisabled]}
                  onPress={tile.onPress}
                  disabled={tile.disabled}
                  stretch
                >
                  <LinearGradient
                    colors={toneGradient(tile.tone)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tile}
                  >
                    <Text style={[styles.tileWatermark, toneWash(tile.tone)]} pointerEvents="none">
                      {tile.mark}
                    </Text>
                    <View style={styles.tileFill}>
                      <Text style={[styles.tileLabel, toneLabel(tile.tone)]} numberOfLines={2}>
                        {tile.label}
                      </Text>
                    </View>
                  </LinearGradient>
                </SoftPressable>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomSheet
        visible={showMorningBrief}
        onClose={dismissMorningBrief}
        title={t('home.morningBriefTitle')}
      >
        <MorningBrief
          embedded
          tasks={todayTasks}
          workdayStart={dayWindow.start}
          workdayEnd={dayWindow.end}
          weatherCity={settings.weatherCity}
          weatherLat={settings.weatherLat}
          weatherLon={settings.weatherLon}
          planning={planning}
          onPlanDay={openPlanSheet}
          onDismiss={dismissMorningBrief}
        />
      </BottomSheet>

      <BottomSheet visible={weekOpen} onClose={dismissWeeklyBrief} title={t('home.weeklyBriefTitle')}>
        <WeeklyBrief
          onClose={dismissWeeklyBrief}
          onPlanDay={openPlanSheet}
          onOpenTasks={() => {
            dismissWeeklyBrief()
            router.push('/tasks')
          }}
          onOpenBills={() => {
            dismissWeeklyBrief()
            router.push('/bills')
          }}
        />
      </BottomSheet>

      <PlanDaySheet
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        tasks={todayTasks}
        weatherCity={settings.weatherCity}
        weatherLat={settings.weatherLat}
        weatherLon={settings.weatherLon}
        planning={planning}
        onArrange={onArrangeDay}
        onMoveTomorrow={(task) => {
          updateTaskFields(task, { date: tomorrowISO() })
        }}
        onDrop={(task) => {
          deleteTask(task.id)
        }}
        onSetTime={(task, time) => {
          updateTaskFields(task, {
            time,
            date: task.date || todayISO(),
          })
        }}
        onAddTask={({ title, time }) => {
          if (!userId) return
          createTaskLocal({
            title,
            date: todayISO(),
            time,
            priority: 'medium',
            userId,
          })
        }}
      />
    </Screen>
  )
}

function toneGradient(tone: Tone): [string, string] {
  switch (tone) {
    case 'ink':
      return ['#163842', '#0A5751']
    case 'teal':
      return ['#D7EDE9', '#B9DFD8']
    case 'soft':
      return ['#FFFFFF', '#F3F7F8']
    default:
      return ['#F7FBFC', '#E4EEF1']
  }
}

function toneWash(tone: Tone) {
  return tone === 'ink' ? styles.washOnInk : styles.washOnLight
}

function toneLabel(tone: Tone) {
  return tone === 'ink' ? styles.labelOnInk : styles.labelOnLight
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 140,
    gap: spacing.xl,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    alignSelf: 'center',
    flexGrow: 1,
  },
  hero: {
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 2,
  },
  markGlow: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,42,50,0.08)',
  },
  brandWord: {
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 56,
    letterSpacing: -1.8,
    lineHeight: 58,
    marginTop: 14,
  },
  hello: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.bodyMedium,
    letterSpacing: -0.15,
    marginTop: 14,
  },
  date: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: fonts.body,
    marginTop: 3,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  tileWrap: {
    width: '47%',
    flexGrow: 1,
    minWidth: '42%',
    maxWidth: '48.5%',
    aspectRatio: 1,
  },
  tileShell: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: '#0F2A32',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tile: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,42,50,0.08)',
    overflow: 'hidden',
  },
  tileDisabled: { opacity: 0.45 },
  tileWatermark: {
    position: 'absolute',
    right: 4,
    bottom: 36,
    fontFamily: fonts.brand,
    fontSize: 72,
    lineHeight: 72,
    letterSpacing: -2,
  },
  washOnInk: { color: 'rgba(247,251,250,0.10)' },
  washOnLight: { color: 'rgba(10,87,81,0.08)' },
  tileFill: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  tileLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  labelOnInk: { color: colors.textOnAccent },
  labelOnLight: { color: colors.text },
})
