import { format } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeInUp,
  FadeOut,
  Layout,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { dateLocale } from '../../lib/dateLocale'
import { DOW_LABELS, normalizeTypicalWeek } from '../../lib/scheduleDay'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import { defaultTypicalWeek, type Dow, type WeekAnchor } from '../../types'

const ANCHOR_PRESETS = [
  { titleKey: 'settings.anchorDeepWork' as const, time: '09:30', durationMin: 90 },
  { titleKey: 'settings.anchorSport' as const, time: '19:00', durationMin: 60 },
  { titleKey: 'settings.anchorFamily' as const, time: '18:30', durationMin: 90 },
]

const REST_STARTS = ['10:00', '11:00'] as const
const REST_ENDS = ['13:00', '14:00', '16:00'] as const

async function lightHaptic() {
  try {
    const Haptics = await import('expo-haptics')
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {
    // web / unavailable
  }
}

function DayCell({
  label,
  on,
  index,
  onPress,
}: {
  label: string
  on: boolean
  index: number
  onPress: () => void
}) {
  const progress = useSharedValue(on ? 1 : 0)
  const enter = useSharedValue(0)

  useEffect(() => {
    enter.value = withDelay(
      90 + index * 45,
      withSpring(1, { damping: 15, stiffness: 180 }),
    )
  }, [enter, index])

  useEffect(() => {
    progress.value = withSpring(on ? 1 : 0, { damping: 17, stiffness: 240 })
  }, [on, progress])

  const shell = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [14, 0]) },
      { scale: interpolate(enter.value, [0, 1], [0.86, 1]) * interpolate(progress.value, [0, 1], [1, 1.04]) },
    ],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.bgElevated, colors.accent],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.accentStrong],
    ),
  }))

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textMuted, colors.textOnAccent]),
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        lightHaptic().catch(() => undefined)
        onPress()
      }}
      style={styles.dayPress}
    >
      <Animated.View style={[styles.dayBtn, shell]}>
        <Animated.Text style={[styles.dayText, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

function TimeChip({
  label,
  on,
  onPress,
}: {
  label: string
  on: boolean
  onPress: () => void
}) {
  const progress = useSharedValue(on ? 1 : 0)
  useEffect(() => {
    progress.value = withSpring(on ? 1 : 0, { damping: 16, stiffness: 260 })
  }, [on, progress])

  const shell = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.bgElevated, 'rgba(15,110,102,0.14)'],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.accent],
    ),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.03]) }],
  }))
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textMuted, colors.accentStrong]),
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        lightHaptic().catch(() => undefined)
        onPress()
      }}
    >
      <Animated.View style={[styles.timeChip, shell]}>
        <Animated.Text style={[styles.timeChipText, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

function RhythmBar({ workDays }: { workDays: boolean[] }) {
  return (
    <View style={styles.rhythm}>
      {workDays.map((on, i) => (
        <RhythmSeg key={i} on={on} index={i} />
      ))}
    </View>
  )
}

function RhythmSeg({ on, index }: { on: boolean; index: number }) {
  const progress = useSharedValue(on ? 1 : 0)
  useEffect(() => {
    progress.value = withDelay(
      index * 30,
      withTiming(on ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) }),
    )
  }, [on, index, progress])
  const style = useAnimatedStyle(() => ({
    flex: 1,
    height: interpolate(progress.value, [0, 1], [3, 6]),
    borderRadius: 99,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(15,42,50,0.12)', colors.accent],
    ),
    opacity: interpolate(progress.value, [0, 1], [0.55, 1]),
  }))
  return <Animated.View style={style} />
}

function ProgressRail({ step }: { step: number }) {
  return (
    <View style={styles.rail}>
      {[0, 1, 2].map((i) => (
        <RailSeg key={i} active={i <= step} delay={i * 80} />
      ))}
    </View>
  )
}

function RailSeg({ active, delay }: { active: boolean; delay: number }) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(active ? 1 : 0.28, { duration: 420, easing: Easing.out(Easing.cubic) }),
    )
  }, [active, delay, progress])
  const style = useAnimatedStyle(() => ({
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: colors.accent,
    opacity: progress.value,
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [0.4, 1]) }],
  }))
  return <Animated.View style={style} />
}

export default function WeekScreen() {
  const t = useT()
  const router = useRouter()
  const existing = useNovaStore((s) => s.settings.typicalWeek)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const [week, setWeek] = useState(() => normalizeTypicalWeek(existing))

  const locale = dateLocale(t.language)
  const dowLabels = DOW_LABELS.map(({ key }) => ({
    key,
    short: format(new Date(2024, 0, 7 + key, 12), 'EEE', { locale }),
  }))

  const patch = (next: Partial<typeof week>) => {
    setWeek((prev) => normalizeTypicalWeek({ ...prev, ...next }))
  }

  const toggleWorkDay = (dow: Dow) => {
    const workDays = [...week.workDays] as typeof week.workDays
    workDays[dow] = !workDays[dow]
    patch({ workDays })
  }

  const addAnchor = (preset: (typeof ANCHOR_PRESETS)[0]) => {
    const anchor: WeekAnchor = {
      id: `a_${Math.random().toString(36).slice(2, 8)}`,
      title: t(preset.titleKey),
      time: preset.time,
      durationMin: preset.durationMin,
      days: week.workDays[2] ? [2, 4] : [1, 3],
    }
    lightHaptic().catch(() => undefined)
    patch({ anchors: [...week.anchors, anchor].slice(0, 6) })
  }

  const removeAnchor = (id: string) => {
    patch({ anchors: week.anchors.filter((a) => a.id !== id) })
  }

  const goReady = (typicalWeek: typeof week) => {
    updateSettings({ typicalWeek: normalizeTypicalWeek(typicalWeek) })
    router.push('/ready')
  }

  const workDayNames = useMemo(
    () => dowLabels.filter(({ key }) => week.workDays[key]).map(({ short }) => short),
    [dowLabels, week.workDays],
  )
  const restDayNames = useMemo(
    () => dowLabels.filter(({ key }) => !week.workDays[key]).map(({ short }) => short),
    [dowLabels, week.workDays],
  )

  const summary =
    workDayNames.length === 0
      ? t.tf('onboarding.weekSummaryRestOnly', {
          start: week.weekendStart,
          end: week.weekendEnd,
        })
      : restDayNames.length === 0
        ? t('onboarding.weekSummaryAllWork')
        : t.tf('onboarding.weekSummary', {
            work: workDayNames.join(' · '),
            rest: restDayNames.join(' · '),
            start: week.weekendStart,
            end: week.weekendEnd,
          })

  const focusStep = week.anchors.length > 0 ? 2 : 1

  return (
    <Screen>
      <LinearGradient
        colors={['rgba(15,110,102,0.14)', 'rgba(232,238,241,0)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 0.55 }}
        style={styles.heroWash}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(520).springify().damping(17)}>
          <ProgressRail step={focusStep} />
          <Text style={styles.kicker}>{t('onboarding.weekKicker')}</Text>
          <Text style={styles.title}>{t('onboarding.weekTitle')}</Text>
          <Text style={styles.sub}>{t('onboarding.weekSub')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(480).springify().damping(17)}
          style={styles.panel}
        >
          <Text style={styles.stepNum}>{t('onboarding.weekStep1')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.weekWorkTitle')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.weekWorkHint')}</Text>
          <View style={styles.weekRow}>
            {dowLabels.map(({ key, short }, index) => (
              <DayCell
                key={key}
                label={short}
                on={week.workDays[key]}
                index={index}
                onPress={() => toggleWorkDay(key)}
              />
            ))}
          </View>
          <RhythmBar workDays={[...week.workDays]} />
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotOn]} />
              <Text style={styles.legendText}>{t('onboarding.weekLegendWork')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>{t('onboarding.weekLegendRest')}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(180).duration(480).springify().damping(17)}
          style={styles.panel}
        >
          <Text style={styles.stepNum}>{t('onboarding.weekStep2')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.weekRestTitle')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.weekRestHint')}</Text>

          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>{t('onboarding.weekFrom')}</Text>
            <View style={styles.presets}>
              {REST_STARTS.map((hm) => (
                <TimeChip
                  key={`ws-${hm}`}
                  label={hm}
                  on={week.weekendStart === hm}
                  onPress={() => patch({ weekendStart: hm })}
                />
              ))}
            </View>
          </View>

          <View style={styles.rangeTrack}>
            <View style={styles.rangeDot} />
            <View style={styles.rangeLine} />
            <Text style={styles.rangeText}>
              {week.weekendStart} – {week.weekendEnd}
            </Text>
            <View style={styles.rangeLine} />
            <View style={styles.rangeDot} />
          </View>

          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>{t('onboarding.weekUntil')}</Text>
            <View style={styles.presets}>
              {REST_ENDS.map((hm) => (
                <TimeChip
                  key={`we-${hm}`}
                  label={hm}
                  on={week.weekendEnd === hm}
                  onPress={() => patch({ weekendEnd: hm })}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(240).duration(480).springify().damping(17)}
          layout={Layout.springify().damping(18)}
          style={styles.summary}
        >
          <Text style={styles.summaryLabel}>{t('onboarding.weekSummaryLabel')}</Text>
          <Animated.Text
            key={summary}
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(120)}
            style={styles.summaryText}
          >
            {summary}
          </Animated.Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(480).springify().damping(17)}
          style={styles.panel}
        >
          <Text style={styles.stepNum}>{t('onboarding.weekStep3')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.weekAnchorsTitle')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.weekAnchorsHint')}</Text>
          <View style={styles.presets}>
            {ANCHOR_PRESETS.map((p, i) => (
              <Animated.View
                key={p.titleKey}
                entering={FadeInRight.delay(340 + i * 50).duration(320)}
              >
                <SoftPressable style={styles.anchorChip} onPress={() => addAnchor(p)}>
                  <Text style={styles.anchorChipText}>+ {t(p.titleKey)}</Text>
                </SoftPressable>
              </Animated.View>
            ))}
          </View>
          {week.anchors.map((a) => (
            <Animated.View
              key={a.id}
              entering={FadeInRight.delay(40).duration(280)}
              exiting={FadeOut.duration(160)}
              layout={Layout.springify().damping(18)}
              style={styles.anchorRow}
            >
              <View style={styles.anchorMeta}>
                <Text style={styles.anchorTitle}>{a.title}</Text>
                <Text style={styles.anchorSub}>
                  {a.time} · {a.durationMin}
                  {t('onboarding.weekMinutesShort')}
                </Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => removeAnchor(a.id)} hitSlop={8}>
                <Text style={styles.remove}>{t('settings.remove')}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(380).duration(420).springify().damping(16)}>
          <SoftPressable style={styles.btn} onPress={() => goReady(week)}>
            <Text style={styles.btnText}>{t('common.continue')}</Text>
          </SoftPressable>
          <Pressable
            accessibilityRole="button"
            style={styles.skip}
            onPress={() => goReady(defaultTypicalWeek())}
          >
            <Text style={styles.skipText}>{t('onboarding.weekSkip')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  rail: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fonts.brand,
    letterSpacing: -0.6,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
    marginTop: 6,
    maxWidth: 360,
  },
  panel: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(245,248,250,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(15,42,50,0.06)',
    gap: 8,
  },
  stepNum: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  sectionHint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dayPress: {
    flex: 1,
  },
  dayBtn: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  rhythm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  legendDotOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  legendText: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  timeBlock: {
    gap: 8,
    marginTop: 4,
  },
  timeLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    minWidth: 78,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  rangeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  rangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  rangeLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(15,110,102,0.22)',
  },
  rangeText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  summary: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(15,110,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(15,110,102,0.18)',
    gap: 6,
    overflow: 'hidden',
  },
  summaryLabel: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryText: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  anchorChip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorChipText: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  anchorMeta: { flex: 1, gap: 2 },
  anchorTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  anchorSub: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  remove: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
})
