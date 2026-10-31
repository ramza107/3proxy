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
import { BrushIcon, type BrushIconName } from '../../components/BrushIcon'
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
  icon: BrushIconName
  label: string
  onPress: () => void
  tone: Tone
  disabled?: boolean
  /** Visible but gated — Free users see what Pro unlocks. */
  proLocked?: boolean
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

  const requireProFeature = (body?: string) => {
    Alert.alert(t('pro.title'), body || t('pro.upgradeBody'), [
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
      icon: 'tasks',
      label: t('tabs.tasks'),
      onPress: () => router.push('/tasks'),
      tone: 'ink',
    },
    {
      key: 'chat',
      icon: 'chat',
      label: t('tabs.chat'),
      onPress: () => router.push('/chat'),
      tone: 'teal',
    },
    {
      key: 'plan',
      icon: 'plan',
      label: planning ? t('home.planning') : t('home.planDay'),
      onPress: openPlanSheet,
      tone: 'mist',
      disabled: planning,
      proLocked: !isProUser,
    },
    {
      key: 'dates',
      icon: 'dates',
      label: t('quick.dates'),
      onPress: () => router.push('/dates'),
      tone: 'mist',
    },
    {
      key: 'bills',
      icon: 'bills',
      label: t('quick.bills'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature()
          return
        }
        router.push('/bills')
      },
      tone: 'soft',
      proLocked: !isProUser,
    },
    {
      key: 'shopping',
      icon: 'shopping',
      label: t('quick.shopping'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature()
          return
        }
        router.push('/shopping')
      },
      tone: 'soft',
      proLocked: !isProUser,
    },
    {
      key: 'life',
      icon: 'life',
      label: t('quick.life'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature()
          return
        }
        router.push('/life')
      },
      tone: 'teal',
      proLocked: !isProUser,
    },
    {
      key: 'news',
      icon: 'news',
      label: t('tabs.news'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature()
          return
        }
        router.push('/news')
      },
      tone: 'mist',
      proLocked: !isProUser,
    },
    {
      key: 'invest',
      icon: 'invest',
      label: t('quick.invest'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature(t('invest.proText'))
          return
        }
        router.push('/invest')
      },
      tone: 'soft',
      proLocked: !isProUser,
    },
    {
      key: 'morning',
      icon: 'morning',
      label: t('quick.morning'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature()
          return
        }
        updateSettings({ lastMorningBriefDate: null })
        setForceMorningBrief(true)
      },
      tone: 'teal',
      proLocked: !isProUser,
    },
    {
      key: 'weekly',
      icon: 'weekly',
      label: t('quick.weekly'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature()
          return
        }
        updateSettings({ lastWeeklyBriefDate: null })
        setForceWeeklyBrief(true)
      },
      tone: 'mist',
      proLocked: !isProUser,
    },
    {
      key: 'evening',
      icon: 'evening',
      label: t('home.eveningClear'),
      onPress: () => {
        if (!isProUser) {
          requireProFeature()
          return
        }
        router.push('/evening')
      },
      tone: 'ink',
      proLocked: !isProUser,
    },
    {
      key: 'settings',
      icon: 'settings',
      label: t('tabs.settings'),
      onPress: () => router.push('/settings'),
      tone: 'soft',
    },
  ]

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
            <View style={styles.heroPanel}>
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
            </View>
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
                  style={[
                    styles.tileShell,
                    tile.disabled && styles.tileDisabled,
                    tile.proLocked && styles.tileProLocked,
                  ]}
                  onPress={tile.onPress}
                  disabled={tile.disabled}
                  fill
                >
                  <LinearGradient
                    colors={toneGradient(tile.tone)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tile}
                  >
                    <View style={styles.tileFill}>
                      <View style={styles.tileTop}>
                        <View style={styles.iconSlot}>
                          <BrushIcon
                            name={tile.icon}
                            size={34}
                            color={
                              tile.proLocked
                                ? colors.textMuted
                                : tile.tone === 'ink'
                                  ? colors.textOnAccent
                                  : colors.accentStrong
                            }
                          />
                        </View>
                        {tile.proLocked ? (
                          <View
                            style={[
                              styles.proBadge,
                              tile.tone === 'ink' && styles.proBadgeOnInk,
                            ]}
                          >
                            <Text
                              style={[
                                styles.proBadgeText,
                                tile.tone === 'ink' && styles.proBadgeTextOnInk,
                              ]}
                            >
                              {t('pro.badge')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.tileLabel,
                          toneLabel(tile.tone),
                          tile.proLocked && styles.tileLabelLocked,
                        ]}
                        numberOfLines={2}
                      >
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

function toneLabel(tone: Tone) {
  return tone === 'ink' ? styles.labelOnInk : styles.labelOnLight
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
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
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,110,102,0.18)',
  },
  heroPanel: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 4,
  },
  brandWord: {
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 48,
    letterSpacing: -1.6,
    lineHeight: 52,
    marginTop: 10,
  },
  hello: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.bodyMedium,
    letterSpacing: -0.15,
    marginTop: 8,
  },
  date: {
    color: colors.textDim,
    fontSize: 13,
    fontFamily: fonts.body,
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
  tileProLocked: { opacity: 0.72 },
  tileFill: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  tileTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconSlot: {
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(15,42,50,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,42,50,0.14)',
  },
  proBadgeOnInk: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  proBadgeText: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  proBadgeTextOnInk: {
    color: colors.textOnAccent,
  },
  tileLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  tileLabelLocked: {
    color: colors.textDim,
  },
  labelOnInk: { color: colors.textOnAccent },
  labelOnLight: { color: colors.text },
})
