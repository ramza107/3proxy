import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../../components/Screen'
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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('onboarding.weekTitle')}</Text>
        <Text style={styles.sub}>{t('onboarding.weekSub')}</Text>

        <Text style={styles.label}>{t('settings.workDays')}</Text>
        <View style={styles.presets}>
          {dowLabels.map(({ key, short }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              style={[styles.chip, week.workDays[key] && styles.chipOn]}
              onPress={() => toggleWorkDay(key)}
            >
              <Text style={[styles.chipText, week.workDays[key] && styles.chipTextOn]}>
                {short}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('settings.lightDays')}</Text>
        <View style={styles.presets}>
          {['10:00', '11:00'].map((hm) => (
            <Pressable
              key={`ws-${hm}`}
              accessibilityRole="button"
              style={[styles.chip, week.weekendStart === hm && styles.chipOn]}
              onPress={() => patch({ weekendStart: hm })}
            >
              <Text style={[styles.chipText, week.weekendStart === hm && styles.chipTextOn]}>
                {t.tf('settings.hourStart', { t: hm })}
              </Text>
            </Pressable>
          ))}
          {['13:00', '14:00', '16:00'].map((hm) => (
            <Pressable
              key={`we-${hm}`}
              accessibilityRole="button"
              style={[styles.chip, week.weekendEnd === hm && styles.chipOn]}
              onPress={() => patch({ weekendEnd: hm })}
            >
              <Text style={[styles.chipText, week.weekendEnd === hm && styles.chipTextOn]}>
                {t.tf('settings.hourEnd', { t: hm })}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('settings.anchors')}</Text>
        <Text style={styles.hint}>{t('onboarding.weekAnchorsHint')}</Text>
        <View style={styles.presets}>
          {ANCHOR_PRESETS.map((p) => (
            <Pressable
              key={p.titleKey}
              accessibilityRole="button"
              style={styles.chip}
              onPress={() => addAnchor(p)}
            >
              <Text style={styles.chipText}>+ {t(p.titleKey)}</Text>
            </Pressable>
          ))}
        </View>
        {week.anchors.map((a) => (
          <View key={a.id} style={styles.anchorRow}>
            <Text style={styles.anchorTitle}>
              {a.title} · {a.time} · {a.durationMin}m
            </Text>
            <Pressable accessibilityRole="button" onPress={() => removeAnchor(a.id)} hitSlop={8}>
              <Text style={styles.remove}>{t('settings.remove')}</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          style={styles.btn}
          onPress={() => goReady(week)}
        >
          <Text style={styles.btnText}>{t('common.continue')}</Text>
        </Pressable>
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
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.sm,
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
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -2,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    cursor: 'pointer',
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextOn: { color: colors.accentStrong },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  anchorTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, flex: 1 },
  remove: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 17 },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    cursor: 'pointer',
  },
  skipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 15 },
})
