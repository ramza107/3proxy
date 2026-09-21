import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
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
  onAddTask?: (input: { title: string; time: string }) => void
}

type DaySlot = {
  id: string
  label: string
  time: string
  hint: string
}

type SlotRect = { id: string; y: number; height: number }

const DAY_SLOTS: DaySlot[] = [
  { id: 'morning', label: 'Morning', time: '09:00', hint: 'Focus' },
  { id: 'midday', label: 'Midday', time: '12:30', hint: 'Calls' },
  { id: 'afternoon', label: 'Afternoon', time: '15:00', hint: 'Deep work' },
  { id: 'evening', label: 'Evening', time: '18:30', hint: 'Home' },
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

function hitSlotId(rects: SlotRect[], absoluteY: number): string | null {
  for (const r of rects) {
    if (absoluteY >= r.y && absoluteY <= r.y + r.height) return r.id
  }
  return null
}

async function nudge() {
  try {
    const Haptics = await import('expo-haptics')
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {
    // web / unavailable
  }
}

type DragRowProps = {
  task: Task
  locked: boolean
  draggingId: string | null
  hoverSlotId: string | null
  slotRectsRef: React.MutableRefObject<SlotRect[]>
  onProtect: () => void
  onMoveTomorrow: () => void
  onDropTask: () => void
  onHoverSlot: (slotId: string | null) => void
  onDragging: (id: string | null) => void
  onMoveToSlot: (slotId: string) => void
}

function DraggableTaskRow({
  task,
  locked,
  draggingId,
  slotRectsRef,
  onProtect,
  onMoveTomorrow,
  onDropTask,
  onHoverSlot,
  onDragging,
  onMoveToSlot,
}: DragRowProps) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const scale = useSharedValue(1)
  const elev = useSharedValue(0)
  const isGhost = draggingId === task.id

  const updateHover = (absoluteY: number) => {
    onHoverSlot(hitSlotId(slotRectsRef.current, absoluteY))
  }

  const finish = (absoluteY: number) => {
    const slotId = hitSlotId(slotRectsRef.current, absoluteY)
    onHoverSlot(null)
    onDragging(null)
    if (slotId) {
      onMoveToSlot(slotId)
      nudge().catch(() => undefined)
    }
  }

  const startDrag = () => {
    onDragging(task.id)
    nudge().catch(() => undefined)
  }

  const cancelDrag = () => {
    onHoverSlot(null)
    onDragging(null)
  }

  const pan = Gesture.Pan()
    .activateAfterLongPress(Platform.OS === 'web' ? 180 : 260)
    .maxPointers(1)
    .onStart(() => {
      'worklet'
      scale.value = withSpring(1.04, { damping: 16, stiffness: 280 })
      elev.value = 1
      runOnJS(startDrag)()
    })
    .onUpdate((e) => {
      'worklet'
      tx.value = e.translationX
      ty.value = e.translationY
      runOnJS(updateHover)(e.absoluteY)
    })
    .onEnd((e) => {
      'worklet'
      runOnJS(finish)(e.absoluteY)
      tx.value = withSpring(0, { damping: 18, stiffness: 260 })
      ty.value = withSpring(0, { damping: 18, stiffness: 260 })
      scale.value = withSpring(1)
      elev.value = 0
    })
    .onFinalize((_e, success) => {
      'worklet'
      if (!success) {
        runOnJS(cancelDrag)()
        tx.value = withSpring(0)
        ty.value = withSpring(0)
        scale.value = withSpring(1)
        elev.value = 0
      }
    })

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: elev.value ? 40 : 1,
    shadowOpacity: elev.value ? 0.22 : 0,
    elevation: elev.value ? 10 : 0,
    opacity: draggingId && draggingId !== task.id ? 0.55 : 1,
  }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.slotItem, locked && styles.slotItemLocked, isGhost && styles.slotItemDragging, anim]}
      >
        <Pressable style={styles.slotItemMain} onPress={onProtect}>
          <View
            style={[
              styles.dot,
              task.priority === 'high' && styles.dotHigh,
              task.priority === 'low' && styles.dotLow,
              locked && styles.dotLocked,
            ]}
          />
          <Text style={styles.slotItemTitle} numberOfLines={1}>
            {locked ? '◆ ' : ''}
            {task.title}
          </Text>
          <Text style={styles.dragHint}>⠿</Text>
        </Pressable>
        <View style={styles.slotItemActions}>
          <Pressable onPress={onMoveTomorrow} hitSlop={6}>
            <Text style={styles.miniAct}>Tomorrow</Text>
          </Pressable>
          <Pressable onPress={onDropTask} hitSlop={6}>
            <Text style={styles.miniDanger}>Drop</Text>
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

type PoolDragProps = {
  task: Task
  draggingId: string | null
  slotRectsRef: React.MutableRefObject<SlotRect[]>
  onHoverSlot: (slotId: string | null) => void
  onDragging: (id: string | null) => void
  onMoveToSlot: (slotId: string) => void
  onQuickSet: (time: string) => void
}

function DraggablePoolRow({
  task,
  draggingId,
  slotRectsRef,
  onHoverSlot,
  onDragging,
  onMoveToSlot,
  onQuickSet,
}: PoolDragProps) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const scale = useSharedValue(1)

  const updateHover = (absoluteY: number) => {
    onHoverSlot(hitSlotId(slotRectsRef.current, absoluteY))
  }

  const finish = (absoluteY: number) => {
    const slotId = hitSlotId(slotRectsRef.current, absoluteY)
    onHoverSlot(null)
    onDragging(null)
    if (slotId) {
      onMoveToSlot(slotId)
      nudge().catch(() => undefined)
    }
  }

  const startDrag = () => {
    onDragging(task.id)
    nudge().catch(() => undefined)
  }

  const cancelDrag = () => {
    onHoverSlot(null)
    onDragging(null)
  }

  const pan = Gesture.Pan()
    .activateAfterLongPress(Platform.OS === 'web' ? 180 : 260)
    .maxPointers(1)
    .onStart(() => {
      'worklet'
      scale.value = withSpring(1.04, { damping: 16, stiffness: 280 })
      runOnJS(startDrag)()
    })
    .onUpdate((e) => {
      'worklet'
      tx.value = e.translationX
      ty.value = e.translationY
      runOnJS(updateHover)(e.absoluteY)
    })
    .onEnd((e) => {
      'worklet'
      runOnJS(finish)(e.absoluteY)
      tx.value = withSpring(0)
      ty.value = withSpring(0)
      scale.value = withSpring(1)
    })
    .onFinalize((_e, success) => {
      'worklet'
      if (!success) {
        runOnJS(cancelDrag)()
        tx.value = withSpring(0)
        ty.value = withSpring(0)
        scale.value = withSpring(1)
      }
    })

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: draggingId === task.id ? 40 : 1,
    opacity: draggingId && draggingId !== task.id ? 0.5 : 1,
  }))

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.poolRow, anim]}>
        <View style={styles.poolTitleRow}>
          <Text style={styles.poolTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={styles.dragHint}>⠿</Text>
        </View>
        <View style={styles.poolTimes}>
          {DAY_SLOTS.map((s) => (
            <Pressable key={s.id} style={styles.poolChip} onPress={() => onQuickSet(s.time)}>
              <Text style={styles.poolChipText}>{s.time}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

/**
 * Structured-inspired Plan day with long-press drag between time blocks.
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
  const [showPoem, setShowPoem] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [hoverSlotId, setHoverSlotId] = useState<string | null>(null)
  const slotRectsRef = useRef<SlotRect[]>([])
  const slotViewRefs = useRef<Record<string, View | null>>({})

  const refreshSlotRects = useCallback(() => {
    for (const slot of DAY_SLOTS) {
      const node = slotViewRefs.current[slot.id]
      node?.measureInWindow?.(( _x, y, _w, height) => {
        const next = slotRectsRef.current.filter((r) => r.id !== slot.id)
        next.push({ id: slot.id, y, height: Math.max(height, 48) })
        slotRectsRef.current = next
      })
    }
  }, [])

  const setDragging = useCallback(
    (id: string | null) => {
      if (id) refreshSlotRects()
      setDraggingId(id)
    },
    [refreshSlotRects],
  )

  useEffect(() => {
    if (!visible) {
      setProtectedIds(new Set())
      setDraftSlot(null)
      setDraftTitle('')
      setPoolOpen(false)
      setShowPoem(false)
      setDraggingId(null)
      setHoverSlotId(null)
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
  const filled = DAY_SLOTS.filter((s) => (bySlot[s.id] || []).length > 0).length

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

  const moveTaskToSlot = (task: Task, slotId: string) => {
    const slot = DAY_SLOTS.find((s) => s.id === slotId)
    if (!slot) return
    if (task.time === slot.time) return
    onSetTime(task, slot.time)
  }

  const footer = (
    <>
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
      <Pressable onPress={onClose} style={styles.secondary} hitSlop={8}>
        <Text style={styles.secondaryText}>Not now</Text>
      </Pressable>
    </>
  )

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Plan day"
      subtitle={
        draggingId
          ? 'Drop on a block to reschedule'
          : `${filled} of ${DAY_SLOTS.length} blocks · hold & drag to move · tap to protect`
      }
      footer={footer}
      scrollEnabled={!draggingId}
    >
      <Animated.View entering={FadeIn.duration(380)} style={styles.weatherWrap}>
        <LinearGradient
          colors={palette}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weatherCard}
        >
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
                  <Text style={styles.weatherMood}>{weatherMood(weather.code)}</Text>
                </View>
                <Text style={styles.weatherTemp}>{weather.tempC}°</Text>
              </View>
              <Pressable onPress={() => setShowPoem((v) => !v)} hitSlop={8}>
                <Text style={styles.poemToggle}>
                  {showPoem ? 'Hide verse' : 'A line for the day'}
                </Text>
              </Pressable>
              {showPoem ? (
                <View style={styles.poemInline}>
                  <Text style={styles.poemLines} numberOfLines={3}>
                    {poem.lines}
                  </Text>
                  <Text style={styles.poemMeta}>
                    — {poem.author}
                    {poem.work ? ` · ${poem.work}` : ''}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.weatherFallback}>
              Set a weather city in Settings — the day opens with the sky.
            </Text>
          )}
        </LinearGradient>
      </Animated.View>

      <View style={styles.timeline}>
        <View style={styles.spine} />
        {DAY_SLOTS.map((slot, i) => {
          const items = bySlot[slot.id] || []
          const drafting = draftSlot === slot.id
          const hot = hoverSlotId === slot.id
          return (
            <Animated.View
              key={slot.id}
              entering={FadeInDown.delay(70 + i * 40).duration(300)}
              style={styles.block}
              ref={(node: View | null) => {
                slotViewRefs.current[slot.id] = node
              }}
              onLayout={() => refreshSlotRects()}
            >
              <View style={styles.blockRail}>
                <View
                  style={[
                    styles.node,
                    (items.length > 0 || hot) && styles.nodeFilled,
                    hot && styles.nodeHot,
                  ]}
                />
              </View>
              <View style={[styles.blockBody, hot && styles.blockBodyHot]}>
                <View style={styles.blockHead}>
                  <View>
                    <Text style={styles.blockTime}>{slot.time}</Text>
                    <Text style={styles.blockLabel}>
                      {slot.label}
                      <Text style={styles.blockHint}> · {slot.hint}</Text>
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
                      <Text style={styles.slotAddText}>{drafting ? 'Close' : '+'}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {hot && draggingId ? (
                  <Text style={styles.dropHint}>Release to place here</Text>
                ) : null}

                {items.length === 0 && !drafting && !hot ? (
                  <Text style={styles.slotEmpty}>Open — drag a task here</Text>
                ) : (
                  items.map((t) => {
                    const locked = protectedIds.has(t.id)
                    return (
                      <DraggableTaskRow
                        key={t.id}
                        task={t}
                        locked={locked}
                        draggingId={draggingId}
                        hoverSlotId={hoverSlotId}
                        slotRectsRef={slotRectsRef}
                        onProtect={() => toggleProtect(t.id)}
                        onMoveTomorrow={() => onMoveTomorrow(t)}
                        onDropTask={() => onDrop(t)}
                        onHoverSlot={setHoverSlotId}
                        onDragging={setDragging}
                        onMoveToSlot={(slotId) => moveTaskToSlot(t, slotId)}
                      />
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
              </View>
            </Animated.View>
          )
        })}
      </View>

      {untimed.length > 0 ? (
        <View style={styles.pool}>
          <Pressable style={styles.poolHead} onPress={() => setPoolOpen((v) => !v)}>
            <Text style={styles.sectionLabel}>Untimed · {untimed.length}</Text>
            <Text style={styles.poolToggle}>{poolOpen ? 'Hide' : 'Place'}</Text>
          </Pressable>
          {poolOpen
            ? untimed.map((t) => (
                <DraggablePoolRow
                  key={t.id}
                  task={t}
                  draggingId={draggingId}
                  slotRectsRef={slotRectsRef}
                  onHoverSlot={setHoverSlotId}
                  onDragging={setDragging}
                  onMoveToSlot={(slotId) => moveTaskToSlot(t, slotId)}
                  onQuickSet={(time) => onSetTime(t, time)}
                />
              ))
            : null}
        </View>
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  weatherWrap: { marginBottom: spacing.md },
  weatherCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 108,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  weatherTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  weatherPlace: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  weatherLabel: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 24,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  weatherTemp: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 44,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  weatherMood: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  weatherFallback: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  poemToggle: {
    marginTop: 10,
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  poemInline: { marginTop: 8, gap: 4 },
  poemLines: {
    color: colors.text,
    fontFamily: fonts.brandItalic,
    fontSize: 15,
    lineHeight: 22,
  },
  poemMeta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  timeline: {
    position: 'relative',
    marginBottom: spacing.md,
    paddingLeft: 2,
  },
  spine: {
    position: 'absolute',
    left: 11,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: colors.signalLine,
    borderRadius: 1,
  },
  block: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
    minHeight: 72,
  },
  blockRail: {
    width: 24,
    alignItems: 'center',
    paddingTop: 6,
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.bgElevated,
  },
  nodeFilled: {
    backgroundColor: colors.accent,
  },
  nodeHot: {
    borderColor: colors.accentStrong,
    transform: [{ scale: 1.15 }],
  },
  blockBody: {
    flex: 1,
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.md,
    padding: 12,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  blockBodyHot: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  blockTime: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  blockLabel: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    letterSpacing: -0.2,
    marginTop: 1,
  },
  blockHint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  slotAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotAddText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 16 },
  slotEmpty: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingVertical: 2,
  },
  dropHint: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    paddingVertical: 2,
  },
  slotItem: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.sm,
    paddingHorizontal: 4,
    paddingBottom: 4,
    shadowColor: '#0F2A32',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  slotItemLocked: { opacity: 0.85 },
  slotItemDragging: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  slotItemMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotItemTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  dragHint: {
    color: colors.textDim,
    fontSize: 14,
    letterSpacing: 1,
    paddingHorizontal: 4,
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
  dotLocked: { backgroundColor: colors.bgDeep },
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
  pool: { marginBottom: spacing.sm },
  poolHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  poolToggle: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    marginBottom: 8,
  },
  poolRow: {
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  poolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poolTitle: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
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
  primary: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    height: 50,
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
    paddingVertical: 12,
  },
  secondaryText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
})
