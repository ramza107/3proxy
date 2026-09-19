import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { durationForPriority, minutesToHm, parseHmToMinutes } from '../lib/scheduleDay'
import { TaskCard } from './TaskCard'

type Props = {
  tasks: Task[]
  onToggle: (task: Task) => void
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
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.meta}>
            {dayKind === 'light' ? 'light · ' : ''}
            {workdayStart}–{workdayEnd}
            {openCount ? ` · ${openCount} open` : ' · clear'}
          </Text>
        </View>
        {onPlanDay ? (
          <Pressable
            style={[styles.planBtn, (planning || !hasUntimed && openCount === 0) && styles.planDisabled]}
            onPress={onPlanDay}
            disabled={!!planning}
          >
            <Text style={styles.planBtnText}>{planning ? '…' : 'Plan day'}</Text>
          </Pressable>
        ) : null}
      </View>

      {openCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing scheduled</Text>
          <Text style={styles.emptyText}>Add tasks, then tap Plan day — Wahrly fills free slots.</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {timed.map((slot, i) =>
            slot.kind === 'free' ? (
              <View key={`free-${i}`} style={styles.freeRow}>
                <Text style={styles.timeCol}>
                  {minutesToHm(slot.start)}
                </Text>
                <View style={styles.freeLine}>
                  <Text style={styles.freeText}>
                    free · {Math.max(0, slot.end - slot.start)}m
                  </Text>
                </View>
              </View>
            ) : (
              <View key={slot.task.id} style={styles.taskRow}>
                <Text style={styles.timeCol}>{minutesToHm(slot.start)}</Text>
                <View style={styles.taskBody}>
                  <TaskCard task={slot.task} onToggle={() => onToggle(slot.task)} />
                </View>
              </View>
            ),
          )}
          {untimed.length > 0 ? (
            <View style={styles.untimed}>
              <Text style={styles.untimedLabel}>Unscheduled</Text>
              {untimed.map((t) => (
                <TaskCard key={t.id} task={t} onToggle={() => onToggle(t)} />
              ))}
            </View>
          ) : null}
        </View>
      )}

      <Text style={styles.hint}>
        {suggestion ||
          (hasUntimed
            ? 'Plan day packs unscheduled tasks into free gaps (high priority first).'
            : openCount
              ? 'Day is packed. Say “plan my day” anytime after adding more.'
              : 'Smart day = Motion-style packing without leaving Wahrly.')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  planBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDisabled: { opacity: 0.45 },
  planBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  timeline: { gap: 4 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timeCol: {
    width: 44,
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingTop: 16,
  },
  freeLine: {
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  freeText: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  taskBody: { flex: 1 },
  untimed: { gap: 8, marginTop: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  untimedLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  empty: {
    paddingVertical: spacing.md,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 17, fontFamily: fonts.bodyBold },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
})
