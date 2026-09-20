import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { durationForPriority, minutesToHm, parseHmToMinutes } from '../lib/scheduleDay'
import { SoftPressable } from './SoftPressable'

type Props = {
  tasks: Task[]
  /** Complete / reopen via the check node */
  onToggle: (task: Task) => void
  /** Tap the row body → edit sheet */
  onEdit?: (task: Task) => void
  workdayStart?: string
  workdayEnd?: string
  dayKind?: 'work' | 'light'
  onPlanDay?: () => void | Promise<void>
  planning?: boolean
  suggestion?: string
}

type Slot =
  | { kind: 'task'; start: number; end: number; task: Task }
  | { kind: 'free'; start: number; end: number }

/** Soft teal ladder — priority without traffic-light red/yellow clash. */
const NODE: Record<Task['priority'], string> = {
  high: colors.accentStrong,
  medium: colors.accent,
  low: colors.signalMuted,
}

function buildSlots(
  tasks: Task[],
  workStart: string,
  workEnd: string,
): { timed: Slot[]; untimed: Task[] } {
  const start = parseHmToMinutes(workStart) ?? 9 * 60
  const end = parseHmToMinutes(workEnd) ?? 18 * 60
  const open = tasks.filter((t) => !t.completed)
  const withTime = open
    .filter((t) => t.time && parseHmToMinutes(t.time!) != null)
    .map((t) => {
      const s = parseHmToMinutes(t.time!)!
      return { kind: 'task' as const, start: s, end: s + durationForPriority(t.priority), task: t }
    })
    .sort((a, b) => a.start - b.start)

  const untimed = open.filter((t) => !t.time)
  const slots: Slot[] = []
  let cursor = start
  for (const block of withTime) {
    if (block.start > cursor) {
      slots.push({ kind: 'free', start: cursor, end: Math.min(block.start, end) })
    }
    slots.push(block)
    cursor = Math.max(cursor, block.end)
  }
  if (cursor < end) slots.push({ kind: 'free', start: cursor, end })
  return { timed: slots, untimed }
}

export function DailyPlan({
  tasks,
  onToggle,
  onEdit,
  workdayStart = '09:00',
  workdayEnd = '18:00',
  dayKind = 'work',
  onPlanDay,
  planning,
  suggestion,
}: Props) {
  const { timed, untimed } = buildSlots(tasks, workdayStart, workdayEnd)
  const hasUntimed = untimed.length > 0
  const openCount = tasks.filter((t) => !t.completed).length

  return (
    <Animated.View entering={FadeIn.duration(380)} style={styles.wrap}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.meta}>
            {dayKind === 'light' ? 'Light day · ' : ''}
            {workdayStart}–{workdayEnd}
            {openCount ? ` · ${openCount} open` : ' · clear'}
          </Text>
        </View>
        {onPlanDay ? (
          <SoftPressable
            style={[styles.planBtn, (planning || (!hasUntimed && openCount === 0)) && styles.planDisabled]}
            onPress={onPlanDay}
            disabled={!!planning}
          >
            <Text style={styles.planBtnText}>{planning ? 'Planning…' : 'Plan day'}</Text>
          </SoftPressable>
        ) : null}
      </View>

      {openCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No open tasks yet. Add one below, then Plan day.</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          <View style={styles.spine} />
          {timed.map((slot, i) =>
            slot.kind === 'free' ? (
              <Animated.View
                key={`free-${i}`}
                entering={FadeInRight.delay(Math.min(i, 8) * 40).duration(280)}
                style={styles.row}
              >
                <View style={styles.nodeCol}>
                  <View style={styles.nodeFree} />
                </View>
                <Text style={styles.timeCol}>{minutesToHm(slot.start)}</Text>
                <Text style={styles.freeText}>
                  free · {Math.max(0, slot.end - slot.start)}m
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                key={slot.task.id}
                entering={FadeInRight.delay(Math.min(i, 8) * 40).duration(280)}
              >
                <View style={styles.row}>
                  <Pressable
                    style={styles.nodeCol}
                    onPress={() => onToggle(slot.task)}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !!slot.task.completed }}
                    accessibilityLabel="Mark done"
                  >
                    <View
                      style={[styles.nodeOn, { backgroundColor: NODE[slot.task.priority] }]}
                    />
                  </Pressable>
                  <Pressable
                    style={styles.rowBody}
                    onPress={() => (onEdit ? onEdit(slot.task) : onToggle(slot.task))}
                    accessibilityRole="button"
                    accessibilityLabel="Edit task"
                  >
                    <Text style={styles.timeCol}>{minutesToHm(slot.start)}</Text>
                    <View style={styles.taskBody}>
                      <Text
                        style={[styles.taskTitle, slot.task.completed && styles.taskDone]}
                        numberOfLines={2}
                      >
                        {slot.task.title}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </Animated.View>
            ),
          )}
          {untimed.length > 0 ? (
            <View style={styles.untimed}>
              <Text style={styles.untimedLabel}>Later</Text>
              {untimed.map((t, i) => (
                <Animated.View
                  key={t.id}
                  entering={FadeInRight.delay(120 + Math.min(i, 6) * 40).duration(280)}
                >
                  <View style={styles.row}>
                    <Pressable
                      style={styles.nodeCol}
                      onPress={() => onToggle(t)}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityLabel="Mark done"
                    >
                      <View style={[styles.nodeOn, { backgroundColor: NODE[t.priority] }]} />
                    </Pressable>
                    <Pressable
                      style={styles.rowBody}
                      onPress={() => (onEdit ? onEdit(t) : onToggle(t))}
                      accessibilityRole="button"
                      accessibilityLabel="Edit task"
                    >
                      <Text style={styles.timeCol}>—</Text>
                      <View style={styles.taskBody}>
                        <Text style={styles.taskTitle} numberOfLines={2}>
                          {t.title}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : null}
        </View>
      )}

      {suggestion ? <Text style={styles.hint}>{suggestion}</Text> : null}
      {!suggestion && hasUntimed ? (
        <Text style={styles.hint}>Plan day places untimed tasks into free gaps.</Text>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: 4 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  planBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDisabled: { opacity: 0.4 },
  planBtnText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  timeline: { position: 'relative', paddingLeft: 2, gap: 0 },
  spine: {
    position: 'absolute',
    left: 11,
    top: 8,
    bottom: 8,
    width: 1.5,
    backgroundColor: colors.signalLine,
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    minHeight: 44,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  nodeCol: { width: 28, alignItems: 'center', paddingTop: 4 },
  nodeOn: {
    width: 18,
    height: 18,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  nodeFree: {
    width: 8,
    height: 8,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: colors.signalMuted,
    backgroundColor: colors.bg,
  },
  timeCol: {
    width: 40,
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingTop: 2,
  },
  freeText: {
    flex: 1,
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingTop: 1,
  },
  taskBody: { flex: 1, gap: 2 },
  taskTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  taskDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  untimed: { marginTop: 4, paddingTop: 4 },
  untimedLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 38,
  },
  empty: { paddingVertical: spacing.md },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
})
