import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
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
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(420).springify().damping(18)}>
          <Text style={styles.kicker}>{t('onboarding.weekKicker')}</Text>
          <Text style={styles.title}>{t('onboarding.weekTitle')}</Text>
          <Text style={styles.sub}>{t('onboarding.weekSub')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(420).springify().damping(18)}
          style={styles.section}
        >
          <Text style={styles.stepNum}>{t('onboarding.weekStep1')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.weekWorkTitle')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.weekWorkHint')}</Text>
          <View style={styles.weekRow}>
            {dowLabels.map(({ key, short }) => {
              const on = week.workDays[key]
              return (
                <SoftPressable
                  key={key}
                  style={[styles.dayBtn, on && styles.dayBtnOn]}
                  onPress={() => toggleWorkDay(key)}
                >
                  <Text style={[styles.dayText, on && styles.dayTextOn]}>{short}</Text>
                </SoftPressable>
              )
            })}
          </View>
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
          entering={FadeInDown.delay(140).duration(420).springify().damping(18)}
          style={styles.section}
        >
          <Text style={styles.stepNum}>{t('onboarding.weekStep2')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.weekRestTitle')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.weekRestHint')}</Text>

          <Text style={styles.timeLabel}>{t('onboarding.weekFrom')}</Text>
          <View style={styles.presets}>
            {REST_STARTS.map((hm) => {
              const on = week.weekendStart === hm
              return (
                <SoftPressable
                  key={`ws-${hm}`}
                  style={[styles.timeChip, on && styles.timeChipOn]}
                  onPress={() => patch({ weekendStart: hm })}
                >
                  <Text style={[styles.timeChipText, on && styles.timeChipTextOn]}>{hm}</Text>
                </SoftPressable>
              )
            })}
          </View>

          <Text style={styles.timeLabel}>{t('onboarding.weekUntil')}</Text>
          <View style={styles.presets}>
            {REST_ENDS.map((hm) => {
              const on = week.weekendEnd === hm
              return (
                <SoftPressable
                  key={`we-${hm}`}
                  style={[styles.timeChip, on && styles.timeChipOn]}
                  onPress={() => patch({ weekendEnd: hm })}
                >
                  <Text style={[styles.timeChipText, on && styles.timeChipTextOn]}>{hm}</Text>
                </SoftPressable>
              )
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(420).springify().damping(18)}
          style={styles.summary}
        >
          <Text style={styles.summaryLabel}>{t('onboarding.weekSummaryLabel')}</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(240).duration(420).springify().damping(18)}
          style={styles.section}
        >
          <Text style={styles.stepNum}>{t('onboarding.weekStep3')}</Text>
          <Text style={styles.sectionTitle}>{t('onboarding.weekAnchorsTitle')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.weekAnchorsHint')}</Text>
          <View style={styles.presets}>
            {ANCHOR_PRESETS.map((p) => (
              <SoftPressable
                key={p.titleKey}
                style={styles.anchorChip}
                onPress={() => addAnchor(p)}
              >
                <Text style={styles.anchorChipText}>+ {t(p.titleKey)}</Text>
              </SoftPressable>
            ))}
          </View>
          {week.anchors.map((a) => (
            <View key={a.id} style={styles.anchorRow}>
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
            </View>
          ))}
        </Animated.View>

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
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
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
  section: {
    marginTop: spacing.sm,
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
  dayBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  dayBtnOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong,
  },
  dayText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  dayTextOn: {
    color: colors.textOnAccent,
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
  timeLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 6,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    minWidth: 76,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  timeChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  timeChipText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  timeChipTextOn: {
    color: colors.accentStrong,
  },
  summary: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(15,110,102,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(15,110,102,0.16)',
    gap: 4,
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
    cursor: 'pointer',
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
    paddingVertical: 10,
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
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  btnText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    cursor: 'pointer',
  },
  skipText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
})
