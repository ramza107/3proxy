import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { poemForDay } from '../lib/poems'
import { todayISO } from '../lib/store'
import { fetchWeatherBrief, formatWeatherLine, type WeatherBrief } from '../lib/weather'
import type { Task } from '../types'
import { BottomSheet } from './BottomSheet'
import { SoftPressable } from './SoftPressable'

type Props = {
  visible: boolean
  onClose: () => void
  tasks: Task[]
  weatherCity?: string
  planning?: boolean
  /** Confirm — pack untimed tasks into free gaps */
  onArrange: () => void | Promise<void>
}

/**
 * Intentional Plan day: weather + a classic line + today’s list,
 * then the user chooses to arrange into free slots.
 */
export function PlanDaySheet({
  visible,
  onClose,
  tasks,
  weatherCity,
  planning,
  onArrange,
}: Props) {
  const day = todayISO()
  const poem = poemForDay(day)
  const open = tasks.filter((t) => !t.completed)
  const timed = open.filter((t) => t.time)
  const untimed = open.filter((t) => !t.time)

  const [weather, setWeather] = useState<WeatherBrief | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setWeatherLoading(true)
    fetchWeatherBrief(weatherCity)
      .then((w) => {
        if (!cancelled) setWeather(w)
      })
      .catch(() => {
        if (!cancelled) setWeather(null)
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [visible, weatherCity])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Plan day">
      <View style={styles.weatherBlock}>
        {weatherLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : weather ? (
          <>
            <Text style={styles.weatherLine}>{formatWeatherLine(weather)}</Text>
            <Text style={styles.weatherSub}>{weather.place}</Text>
          </>
        ) : (
          <Text style={styles.weatherSub}>
            Set a weather city in Settings — or allow location once.
          </Text>
        )}
      </View>

      <View style={styles.poemCard}>
        <Text style={styles.poemLines}>{poem.lines}</Text>
        <Text style={styles.poemMeta}>
          — {poem.author}
          {poem.work ? ` · ${poem.work}` : ''}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Today · {open.length} open</Text>
      {open.length === 0 ? (
        <Text style={styles.empty}>Nothing on the list yet — add a task, then arrange.</Text>
      ) : (
        <View style={styles.list}>
          {open.slice(0, 8).map((t) => (
            <View key={t.id} style={styles.row}>
              <View
                style={[
                  styles.dot,
                  t.priority === 'high' && styles.dotHigh,
                  t.priority === 'low' && styles.dotLow,
                ]}
              />
              <Text style={styles.rowTitle} numberOfLines={1}>
                {t.time ? `${t.time} · ` : ''}
                {t.title}
              </Text>
            </View>
          ))}
          {open.length > 8 ? (
            <Text style={styles.more}>+{open.length - 8} more</Text>
          ) : null}
        </View>
      )}

      <Text style={styles.hint}>
        {untimed.length
          ? `${untimed.length} without a time · ${timed.length} already timed. Arrange places untimed tasks into free gaps around calendar events.`
          : timed.length
            ? 'Everything already has a time — arrange will tidy the day around your calendar.'
            : 'Add open tasks to shape the day.'}
      </Text>

      <SoftPressable
        style={[styles.primary, (planning || open.length === 0) && styles.primaryDisabled]}
        onPress={onArrange}
        disabled={!!planning || open.length === 0}
      >
        <Text style={styles.primaryText}>
          {planning ? 'Arranging…' : 'Arrange into free slots'}
        </Text>
      </SoftPressable>

      <Pressable onPress={onClose} style={styles.secondary}>
        <Text style={styles.secondaryText}>Not now</Text>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  weatherBlock: {
    gap: 4,
    marginBottom: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  weatherLine: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  weatherSub: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  poemCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 10,
    marginBottom: spacing.md,
  },
  poemLines: {
    color: colors.text,
    fontFamily: fonts.brandItalic,
    fontSize: 17,
    lineHeight: 26,
  },
  poemMeta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  list: { gap: 0, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  dotHigh: { backgroundColor: colors.danger },
  dotLow: { backgroundColor: colors.signalMuted },
  rowTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  more: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    paddingTop: 6,
  },
  empty: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  primary: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
})
