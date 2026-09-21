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
  /** Confirm — pack untimed (non-protected) tasks into free gaps */
  onArrange: (skipTaskIds: string[]) => void | Promise<void>
  onMoveTomorrow: (task: Task) => void
  onDrop: (task: Task) => void
  onSetTime: (task: Task, time: string | null) => void
}

const TIME_CHIPS = ['09:00', '11:00', '14:00', '17:00']

/**
 * Intentional Plan day: weather + classic line + triage each task,
 * then Arrange packs what’s left into free slots.
 */
export function PlanDaySheet({
  visible,
  onClose,
  tasks,
  weatherCity,
  planning,
  onArrange,
  onMoveTomorrow,
  onDrop,
  onSetTime,
}: Props) {
  const day = todayISO()
  const poem = poemForDay(day)
  const open = tasks.filter((t) => !t.completed)

  const [weather, setWeather] = useState<WeatherBrief | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set())
  const [timeOpenId, setTimeOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      setProtectedIds(new Set())
      setTimeOpenId(null)
      return
    }
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

  const toggleProtect = (id: string) => {
    setProtectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const arrangeable = open.filter((t) => !protectedIds.has(t.id))
  const untimedArrange = arrangeable.filter((t) => !t.time)

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
          {open.slice(0, 10).map((t) => {
            const locked = protectedIds.has(t.id)
            return (
              <View key={t.id} style={[styles.rowBlock, locked && styles.rowProtected]}>
                <View style={styles.row}>
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
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.chip, locked && styles.chipOn]}
                    onPress={() => toggleProtect(t.id)}
                  >
                    <Text style={[styles.chipText, locked && styles.chipTextOn]}>
                      {locked ? 'Protected' : 'Protect'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chip, timeOpenId === t.id && styles.chipOn]}
                    onPress={() => setTimeOpenId((id) => (id === t.id ? null : t.id))}
                  >
                    <Text style={[styles.chipText, timeOpenId === t.id && styles.chipTextOn]}>
                      Time
                    </Text>
                  </Pressable>
                  <Pressable style={styles.chip} onPress={() => onMoveTomorrow(t)}>
                    <Text style={styles.chipText}>Tomorrow</Text>
                  </Pressable>
                  <Pressable style={styles.chipDanger} onPress={() => onDrop(t)}>
                    <Text style={styles.chipDangerText}>Drop</Text>
                  </Pressable>
                </View>
                {timeOpenId === t.id ? (
                  <View style={styles.timeRow}>
                    {TIME_CHIPS.map((hm) => (
                      <Pressable
                        key={hm}
                        style={[styles.chip, t.time === hm && styles.chipOn]}
                        onPress={() => {
                          onSetTime(t, hm)
                          setTimeOpenId(null)
                        }}
                      >
                        <Text style={[styles.chipText, t.time === hm && styles.chipTextOn]}>
                          {hm}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable
                      style={styles.chip}
                      onPress={() => {
                        onSetTime(t, null)
                        setTimeOpenId(null)
                      }}
                    >
                      <Text style={styles.chipText}>Clear</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )
          })}
          {open.length > 10 ? (
            <Text style={styles.more}>+{open.length - 10} more</Text>
          ) : null}
        </View>
      )}

      <Text style={styles.hint}>
        {protectedIds.size
          ? `${protectedIds.size} protected · Arrange places the rest (${untimedArrange.length} untimed) into free gaps.`
          : untimedArrange.length
            ? `${untimedArrange.length} without a time. Protect keeps a task out of Arrange; Tomorrow / Drop triage first.`
            : arrangeable.length
              ? 'Everything already has a time — Arrange tidies around your calendar.'
              : 'Add open tasks to shape the day.'}
      </Text>

      <SoftPressable
        style={[
          styles.primary,
          (planning || arrangeable.length === 0) && styles.primaryDisabled,
        ]}
        onPress={() => onArrange([...protectedIds])}
        disabled={!!planning || arrangeable.length === 0}
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
  rowBlock: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 6,
  },
  rowProtected: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 18 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 18 },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 12 },
  chipTextOn: { color: colors.accentStrong },
  chipDanger: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  chipDangerText: { color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 12 },
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
