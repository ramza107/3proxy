import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { poemForDay } from '../lib/poems'
import { todayISO } from '../lib/store'
import { fetchWeatherBrief, type WeatherBrief } from '../lib/weather'
import type { Task } from '../types'
import { BottomSheet } from './BottomSheet'
import { SoftPressable } from './SoftPressable'

type Props = {
  visible: boolean
  onClose: () => void
  tasks: Task[]
  weatherCity?: string
  planning?: boolean
  onArrange: (skipTaskIds: string[]) => void | Promise<void>
  onMoveTomorrow: (task: Task) => void
  onDrop: (task: Task) => void
  onSetTime: (task: Task, time: string | null) => void
  /** Quick-add a timed task into a day slot */
  onAddTask?: (input: { title: string; time: string }) => void
}

type DaySlot = {
  id: string
  label: string
  time: string
  hint: string
}

const DAY_SLOTS: DaySlot[] = [
  { id: 'morning', label: 'Morning', time: '09:00', hint: 'Focus block' },
  { id: 'midday', label: 'Midday', time: '12:30', hint: 'Calls & errands' },
  { id: 'afternoon', label: 'Afternoon', time: '15:00', hint: 'Deep work' },
  { id: 'evening', label: 'Evening', time: '18:30', hint: 'Home & people' },
]

function weatherPalette(code?: number): [string, string] {
  if (code == null) return ['#D8E8E4', '#F5F8FA']
  if (code === 0 || code === 1) return ['#C8E4F0', '#E8F4EE']
  if (code === 2 || code === 3) return ['#D0DCE6', '#EEF2F5']
  if (code >= 45 && code <= 48) return ['#D5D8DC', '#ECEEF0']
  if (code >= 51 && code <= 67) return ['#B8CDD8', '#E2EEF2']
  if (code >= 71 && code <= 77) return ['#D4E0EA', '#F2F6F9']
  if (code >= 80 && code <= 82) return ['#AFC4D0', '#DEEAF0']
  if (code >= 95) return ['#9BB0C0', '#D5E2EA']
  return ['#D8E8E4', '#F5F8FA']
}

function weatherMood(code?: number) {
  if (code == null) return 'Set the day'
  if (code === 0 || code === 1) return 'Clear air — good for outdoors'
  if (code === 2 || code === 3) return 'Soft light — steady indoor focus'
  if (code >= 51 && code <= 67) return 'Wet streets — keep travel buffers'
  if (code >= 71 && code <= 77) return 'Cold snap — warm layers'
  if (code >= 95) return 'Storm risk — leave margin'
  return 'Shape the day around the weather'
}

function nearestSlot(time: string | null): string | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h)) return null
  const mins = h * 60 + (m || 0)
  let best: DaySlot = DAY_SLOTS[0]
  let bestDist = Infinity
  for (const s of DAY_SLOTS) {
    const [sh, sm] = s.time.split(':').map(Number)
    const dist = Math.abs(mins - (sh * 60 + sm))
    if (dist < bestDist) {
      bestDist = dist
      best = s
    }
  }
  return best.id
}

/**
 * Intentional Plan day: weather scene + fillable day menu + triage,
 * then Arrange packs the rest into free calendar gaps.
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
  onAddTask,
}: Props) {
  const day = todayISO()
  const poem = poemForDay(day)
  const open = tasks.filter((t) => !t.completed)

  const [weather, setWeather] = useState<WeatherBrief | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set())
  const [draftSlot, setDraftSlot] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [poolOpen, setPoolOpen] = useState(false)

  useEffect(() => {
    if (!visible) {
      setProtectedIds(new Set())
      setDraftSlot(null)
      setDraftTitle('')
      setPoolOpen(false)
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

  const bySlot = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const s of DAY_SLOTS) map[s.id] = []
    for (const t of open) {
      const sid = nearestSlot(t.time)
      if (sid) map[sid].push(t)
    }
    return map
  }, [open])

  const untimed = open.filter((t) => !t.time)
  const arrangeable = open.filter((t) => !protectedIds.has(t.id))
  const palette = weatherPalette(weather?.code)

  const toggleProtect = (id: string) => {
    setProtectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitDraft = (slot: DaySlot) => {
    const title = draftTitle.trim()
    if (!title || !onAddTask) return
    onAddTask({ title, time: slot.time })
    setDraftTitle('')
    setDraftSlot(null)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Plan day">
      <Animated.View entering={FadeIn.duration(380)} style={styles.weatherWrap}>
        <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.weatherCard}>
          {weatherLoading ? (
            <ActivityIndicator color={colors.accentStrong} />
          ) : weather ? (
            <>
              <View style={styles.weatherTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.weatherPlace} numberOfLines={1}>
                    {weather.place}
                  </Text>
                  <Text style={styles.weatherLabel}>{weather.label}</Text>
                </View>
                <Text style={styles.weatherTemp}>{weather.tempC}°</Text>
              </View>
              <Text style={styles.weatherRange}>
                H {weather.highC}° · L {weather.lowC}°
              </Text>
              <Text style={styles.weatherMood}>{weatherMood(weather.code)}</Text>
            </>
          ) : (
            <Text style={styles.weatherFallback}>
              Set a weather city in Settings — the day opens with the sky.
            </Text>
          )}
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(360)} style={styles.poemCard}>
        <Text style={styles.poemLines} numberOfLines={4}>
          {poem.lines}
        </Text>
        <Text style={styles.poemMeta}>
          — {poem.author}
          {poem.work ? ` · ${poem.work}` : ''}
        </Text>
      </Animated.View>

      <Text style={styles.sectionLabel}>Day menu · fill the blocks</Text>
      <View style={styles.menu}>
        {DAY_SLOTS.map((slot, i) => {
          const items = bySlot[slot.id] || []
          const drafting = draftSlot === slot.id
          return (
            <Animated.View
              key={slot.id}
              entering={FadeInDown.delay(90 + i * 45).duration(320)}
              style={styles.slot}
            >
              <View style={styles.slotHead}>
                <View>
                  <Text style={styles.slotLabel}>{slot.label}</Text>
                  <Text style={styles.slotMeta}>
                    {slot.time} · {slot.hint}
                  </Text>
                </View>
                {onAddTask ? (
                  <Pressable
                    style={styles.slotAdd}
                    onPress={() => {
                      setDraftSlot(drafting ? null : slot.id)
                      setDraftTitle('')
                    }}
                  >
                    <Text style={styles.slotAddText}>{drafting ? 'Close' : '+ Add'}</Text>
                  </Pressable>
                ) : null}
              </View>

              {items.length === 0 && !drafting ? (
                <Text style={styles.slotEmpty}>Empty — add something or place from the pool</Text>
              ) : (
                items.map((t) => {
                  const locked = protectedIds.has(t.id)
                  return (
                    <View key={t.id} style={[styles.slotItem, locked && styles.slotItemLocked]}>
                      <Pressable style={styles.slotItemMain} onPress={() => toggleProtect(t.id)}>
                        <View
                          style={[
                            styles.dot,
                            t.priority === 'high' && styles.dotHigh,
                            t.priority === 'low' && styles.dotLow,
                          ]}
                        />
                        <Text style={styles.slotItemTitle} numberOfLines={1}>
                          {t.time ? `${t.time} · ` : ''}
                          {t.title}
                        </Text>
                      </Pressable>
                      <View style={styles.slotItemActions}>
                        <Pressable onPress={() => onMoveTomorrow(t)} hitSlop={6}>
                          <Text style={styles.miniAct}>Tomorrow</Text>
                        </Pressable>
                        <Pressable onPress={() => onDrop(t)} hitSlop={6}>
                          <Text style={styles.miniDanger}>Drop</Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                })
              )}

              {drafting ? (
                <View style={styles.draftRow}>
                  <TextInput
                    value={draftTitle}
                    onChangeText={setDraftTitle}
                    placeholder={`Add to ${slot.label.toLowerCase()}…`}
                    placeholderTextColor={colors.textDim}
                    style={styles.draftInput}
                    autoFocus
                    onSubmitEditing={() => submitDraft(slot)}
                    returnKeyType="done"
                  />
                  <Pressable
                    style={[styles.draftSave, !draftTitle.trim() && styles.draftSaveOff]}
                    onPress={() => submitDraft(slot)}
                    disabled={!draftTitle.trim()}
                  >
                    <Text style={styles.draftSaveText}>Save</Text>
                  </Pressable>
                </View>
              ) : null}
            </Animated.View>
          )
        })}
      </View>

      {untimed.length > 0 ? (
        <View style={styles.pool}>
          <Pressable style={styles.poolHead} onPress={() => setPoolOpen((v) => !v)}>
            <Text style={styles.sectionLabel}>
              Untimed pool · {untimed.length}
            </Text>
            <Text style={styles.poolToggle}>{poolOpen ? 'Hide' : 'Place'}</Text>
          </Pressable>
          {poolOpen
            ? untimed.map((t) => (
                <View key={t.id} style={styles.poolRow}>
                  <Text style={styles.poolTitle} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <View style={styles.poolTimes}>
                    {DAY_SLOTS.map((s) => (
                      <Pressable
                        key={s.id}
                        style={styles.poolChip}
                        onPress={() => onSetTime(t, s.time)}
                      >
                        <Text style={styles.poolChipText}>{s.time}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            : null}
        </View>
      ) : null}

      <Text style={styles.hint}>
        Fill the blocks, protect what must stay, then Arrange drops the rest into free calendar gaps.
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
  weatherWrap: { marginBottom: spacing.md },
  weatherCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 118,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  weatherTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  weatherPlace: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  weatherLabel: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  weatherTemp: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 48,
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  weatherRange: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  weatherMood: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  weatherFallback: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  poemCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.md,
  },
  poemLines: {
    color: colors.text,
    fontFamily: fonts.brandItalic,
    fontSize: 16,
    lineHeight: 24,
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
  menu: { gap: 10, marginBottom: spacing.md },
  slot: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  slotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  slotLabel: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  slotMeta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  slotAdd: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  slotAddText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 12 },
  slotEmpty: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingVertical: 4,
  },
  slotItem: { gap: 4, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  slotItemLocked: { opacity: 0.7 },
  slotItemMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotItemTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  slotItemActions: { flexDirection: 'row', gap: 12, paddingLeft: 16 },
  miniAct: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 12 },
  miniDanger: { color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 12 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  dotHigh: { backgroundColor: colors.danger },
  dotLow: { backgroundColor: colors.signalMuted },
  draftRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  draftInput: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  draftSave: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftSaveOff: { opacity: 0.4 },
  draftSaveText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  pool: { marginBottom: spacing.md },
  poolHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  poolToggle: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13, marginBottom: 8 },
  poolRow: {
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  poolTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  poolTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  poolChip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poolChipText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
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
