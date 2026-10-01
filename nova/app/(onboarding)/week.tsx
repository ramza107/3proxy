import { format } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
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
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
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

/** Map clock labels onto a 08–18 visual track for the rest-hours window. */
const TRACK_START_MIN = 8 * 60
const TRACK_END_MIN = 18 * 60

function hmToMin(hm: string) {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + (m || 0)
}

function trackFrac(hm: string) {
  const v = (hmToMin(hm) - TRACK_START_MIN) / (TRACK_END_MIN - TRACK_START_MIN)
  return Math.min(1, Math.max(0, v))
}

async function lightHaptic() {
  try {
    const Haptics = await import('expo-haptics')
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {
    // web / unavailable
  }
}

function DayPillar({
  letter,
  on,
  index,
  onPress,
}: {
  letter: string
  on: boolean
  index: number
  onPress: () => void
}) {
  const progress = useSharedValue(on ? 1 : 0)
  const enter = useSharedValue(0)

  useEffect(() => {
    enter.value = withDelay(
      120 + index * 55,
      withSpring(1, { damping: 14, stiffness: 160 }),
    )
  }, [enter, index])

  useEffect(() => {
    progress.value = withSpring(on ? 1 : 0, { damping: 16, stiffness: 200 })
  }, [on, progress])

  const wrap = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [22, 0]) }],
  }))

  const fill = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [12, 112]),
    opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
  }))

  const letterStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [colors.textDim, colors.accentStrong],
    ),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1]) }],
  }))

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        lightHaptic().catch(() => undefined)
        onPress()
      }}
      style={styles.pillarPress}
    >
      <Animated.View style={[styles.pillar, wrap]}>
        <View style={styles.pillarWell}>
          <Animated.View style={[styles.pillarFill, fill]}>
            <LinearGradient
              colors={['#147F76', '#0A5751']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.pillarLetter, letterStyle]}>{letter}</Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

function HourPick({
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
    progress.value = withTiming(on ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    })
  }, [on, progress])

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.04]) }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', 'rgba(15,110,102,0.10)'],
    ),
  }))
  const textStyle = useAnimatedStyle(() => ({
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
      hitSlop={6}
    >
      <Animated.View style={[styles.hourPick, style]}>
        <Animated.Text style={[styles.hourPickText, on && styles.hourPickTextOn, textStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

function QuietWindow({ start, end }: { start: string; end: string }) {
  const left = useSharedValue(trackFrac(start))
  const right = useSharedValue(trackFrac(end))

  useEffect(() => {
    left.value = withSpring(trackFrac(start), { damping: 18, stiffness: 180 })
    right.value = withSpring(trackFrac(end), { damping: 18, stiffness: 180 })
  }, [start, end, left, right])

  const windowStyle = useAnimatedStyle(() => {
    const l = left.value * 100
    const r = right.value * 100
    return {
      left: `${l}%`,
      width: `${Math.max(4, r - l)}%`,
    }
  })

  return (
    <View style={styles.timeline}>
      <LinearGradient
        colors={['rgba(15,42,50,0.06)', 'rgba(15,110,102,0.10)', 'rgba(15,42,50,0.06)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.timelineTrack}
      />
      <Animated.View style={[styles.timelineWindow, windowStyle]}>
        <LinearGradient
          colors={['rgba(20,127,118,0.35)', 'rgba(10,87,81,0.85)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.timelineLabels}>
        <Text style={styles.timelineEdge}>08</Text>
        <Text style={styles.timelineEdge}>18</Text>
      </View>
    </View>
  )
}

export default function WeekScreen() {
  const t = useT()
  const router = useRouter()
  const existing = useNovaStore((s) => s.settings.typicalWeek)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const [week, setWeek] = useState(() => normalizeTypicalWeek(existing))

  const locale = dateLocale(t.language)
  const dowLabels = DOW_LABELS.map(({ key }) => {
    const d = new Date(2024, 0, 7 + key, 12)
    return {
      key,
      letter: format(d, 'EEEEE', { locale }),
      short: format(d, 'EEE', { locale }),
    }
  })

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

  return (
    <Screen style={styles.screenRoot}>
      <LinearGradient
        colors={['#D7E8E4', '#E8EEF1', '#E4EAF0']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.orbA} pointerEvents="none" />
      <View style={styles.orbB} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(560).springify().damping(16)}>
          <Text style={styles.brandMark}>{brand.name}</Text>
          <Text style={styles.title}>{t('onboarding.weekTitle')}</Text>
          <Text style={styles.sub}>{t('onboarding.weekSub')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(90).duration(520).springify().damping(16)}
          style={styles.block}
        >
          <Text style={styles.blockEyebrow}>{t('onboarding.weekStep1')}</Text>
          <Text style={styles.blockTitle}>{t('onboarding.weekWorkTitle')}</Text>
          <Text style={styles.blockHint}>{t('onboarding.weekWorkHint')}</Text>

          <View style={styles.pillars}>
            {dowLabels.map(({ key, letter }, index) => (
              <DayPillar
                key={key}
                letter={letter}
                on={week.workDays[key]}
                index={index}
                onPress={() => toggleWorkDay(key)}
              />
            ))}
          </View>

          <View style={styles.legendRow}>
            <Text style={styles.legendText}>{t('onboarding.weekLegendWork')}</Text>
            <Text style={styles.legendDot}>·</Text>
            <Text style={styles.legendTextMuted}>{t('onboarding.weekLegendRest')}</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(170).duration(520).springify().damping(16)}
          style={styles.block}
        >
          <Text style={styles.blockEyebrow}>{t('onboarding.weekStep2')}</Text>
          <Text style={styles.blockTitle}>{t('onboarding.weekRestTitle')}</Text>
          <Text style={styles.blockHint}>{t('onboarding.weekRestHint')}</Text>

          <QuietWindow start={week.weekendStart} end={week.weekendEnd} />

          <View style={styles.hourRow}>
            <Text style={styles.hourSide}>{t('onboarding.weekFrom')}</Text>
            <View style={styles.hourPicks}>
              {REST_STARTS.map((hm) => (
                <HourPick
                  key={`ws-${hm}`}
                  label={hm}
                  on={week.weekendStart === hm}
                  onPress={() => patch({ weekendStart: hm })}
                />
              ))}
            </View>
          </View>
          <View style={styles.hourRow}>
            <Text style={styles.hourSide}>{t('onboarding.weekUntil')}</Text>
            <View style={styles.hourPicks}>
              {REST_ENDS.map((hm) => (
                <HourPick
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
          key={summary}
          entering={FadeIn.duration(320)}
          style={styles.summary}
        >
          <Text style={styles.summaryMark}>{t('onboarding.weekSummaryLabel')}</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(240).duration(520).springify().damping(16)}
          style={styles.block}
        >
          <Text style={styles.blockEyebrow}>{t('onboarding.weekStep3')}</Text>
          <Text style={styles.blockTitle}>{t('onboarding.weekAnchorsTitle')}</Text>
          <Text style={styles.blockHint}>{t('onboarding.weekAnchorsHint')}</Text>

          <View style={styles.habitLinks}>
            {ANCHOR_PRESETS.map((p) => (
              <Pressable
                key={p.titleKey}
                accessibilityRole="button"
                onPress={() => addAnchor(p)}
                style={styles.habitLink}
              >
                <Text style={styles.habitLinkText}>+ {t(p.titleKey)}</Text>
              </Pressable>
            ))}
          </View>

          {week.anchors.map((a) => (
            <Animated.View
              key={a.id}
              entering={FadeInUp.duration(280)}
              exiting={FadeOut.duration(140)}
              layout={Layout.springify().damping(18)}
              style={styles.habitRow}
            >
              <View style={styles.habitSignal} />
              <View style={styles.habitMeta}>
                <Text style={styles.habitTitle}>{a.title}</Text>
                <Text style={styles.habitSub}>
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

        <Animated.View entering={FadeInUp.delay(300).duration(420).springify().damping(16)}>
          <Pressable
            accessibilityRole="button"
            style={styles.cta}
            onPress={() => goReady(week)}
          >
            <LinearGradient
              colors={['#128177', '#0A5751']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ctaFill}
            >
              <Text style={styles.ctaText}>{t('common.continue')}</Text>
            </LinearGradient>
          </Pressable>
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
  screenRoot: {
    backgroundColor: '#E8EEF1',
  },
  orbA: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(15,110,102,0.12)',
  },
  orbB: {
    position: 'absolute',
    top: 220,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(15,42,50,0.05)',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  brandMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brandItalic,
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 44,
    fontFamily: fonts.brand,
    letterSpacing: -0.9,
    maxWidth: 340,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 25,
    fontFamily: fonts.body,
    marginTop: spacing.sm,
    maxWidth: 340,
  },
  block: {
    gap: 8,
  },
  blockEyebrow: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  blockTitle: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  blockHint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
    maxWidth: 340,
  },
  pillars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 132,
    marginTop: 8,
  },
  pillarPress: {
    flex: 1,
    height: '100%',
  },
  pillar: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  pillarWell: {
    width: '100%',
    height: 112,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(15,42,50,0.08)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  pillarFill: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  pillarLetter: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  legendText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  legendTextMuted: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  legendDot: {
    color: colors.textDim,
    fontSize: 13,
  },
  timeline: {
    marginTop: 8,
    marginBottom: 14,
  },
  timelineTrack: {
    height: 14,
    borderRadius: 99,
    overflow: 'hidden',
  },
  timelineWindow: {
    position: 'absolute',
    top: 0,
    height: 14,
    borderRadius: 99,
    overflow: 'hidden',
  },
  timelineLabels: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineEdge: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  hourSide: {
    width: 52,
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  hourPicks: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourPick: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  hourPickText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  hourPickTextOn: {
    fontFamily: fonts.bodyBold,
  },
  summary: {
    marginTop: 4,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,42,50,0.12)',
    gap: 6,
  },
  summaryMark: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryText: {
    color: colors.text,
    fontFamily: fonts.brandItalic,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  habitLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 4,
    marginBottom: 6,
  },
  habitLink: {
    paddingVertical: 4,
  },
  habitLinkText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(10,87,81,0.35)',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  habitSignal: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  habitMeta: { flex: 1, gap: 2 },
  habitTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  habitSub: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  remove: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  cta: {
    marginTop: spacing.sm,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  ctaFill: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
})
