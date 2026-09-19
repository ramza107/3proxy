import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { durationForPriority, minutesToHm, parseHmToMinutes } from '../lib/scheduleDay'

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
          <Text style={styles.kicker}>Signal</Text>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.meta}>
            {dayKind === 'light' ? 'light · ' : ''}
            {workdayStart}–{workdayEnd}
            {openCount ? ` · ${openCount} open` : ' · clear'}
          </Text>
        </View>
        {onPlanDay ? (
          <Pressable
            style={[styles.planBtn, (planning || (!hasUntimed && openCount === 0)) && styles.planDisabled]}
            onPress={onPlanDay}
            disabled={!!planning}
          >
            <Text style={styles.planBtnText}>{planning ? '…' : 'Plan day'}</Text>
          </Pressable>
        ) : null}
      </View>

      {openCount === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyNode} />
          <Text style={styles.emptyTitle}>Clear signal</Text>
          <Text style={styles.emptyText}>Add tasks, then Plan day — Wahrly fills free slots on the line.</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          <View style={styles.spine} />
          {timed.map((slot, i) =>
            slot.kind === 'free' ? (
              <View key={`free-${i}`} style={styles.row}>
                <View style={styles.nodeCol}>
                  <View style={styles.nodeFree} />
                </View>
                <Text style={styles.timeCol}>{minutesToHm(slot.start)}</Text>
                <Text style={styles.freeText}>
                  free · {Math.max(0, slot.end - slot.start)}m
                </Text>
              </View>
            ) : (
              <Pressable
                key={slot.task.id}
                style={styles.row}
                onPress={() => onToggle(slot.task)}
              >
                <View style={styles.nodeCol}>
                  <View
                    style={[
                      styles.nodeOn,
                      { backgroundColor: colors[slot.task.priority] },
                    ]}
                  />
                </View>
                <Text style={styles.timeCol}>{minutesToHm(slot.start)}</Text>
                <View style={styles.taskBody}>
                  <Text
                    style={[styles.taskTitle, slot.task.completed && styles.taskDone]}
                    numberOfLines={2}
                  >
                    {slot.task.title}
                  </Text>
                  <Text style={styles.taskMeta}>
                    {slot.task.priority}
                    {slot.task.time ? ` · ${slot.task.time}` : ''}
                  </Text>
                </View>
              </Pressable>
            ),
          )}
          {untimed.length > 0 ? (
            <View style={styles.untimed}>
              <Text style={styles.untimedLabel}>Off-rail</Text>
              {untimed.map((t) => (
                <Pressable key={t.id} style={styles.row} onPress={() => onToggle(t)}>
                  <View style={styles.nodeCol}>
                    <View style={[styles.nodeOn, { backgroundColor: colors[t.priority] }]} />
                  </View>
                  <Text style={styles.timeCol}>—</Text>
                  <View style={styles.taskBody}>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {t.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      )}

      <Text style={styles.hint}>
        {suggestion ||
          (hasUntimed
            ? 'Plan day packs off-rail tasks into free gaps on the signal.'
            : openCount
              ? 'Signal is packed. Add more anytime — then Plan day again.'
              : 'Your day as one continuous signal.')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 34,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  planBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  planDisabled: { opacity: 0.45 },
  planBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  timeline: { position: 'relative', paddingLeft: 2, gap: 0 },
  spine: {
    position: 'absolute',
    left: 11,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: colors.signalLine,
    borderRadius: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  nodeCol: { width: 24, alignItems: 'center', paddingTop: 4 },
  nodeOn: {
    width: 12,
    height: 12,
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
    paddingTop: 3,
  },
  freeText: {
    flex: 1,
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingTop: 2,
    fontStyle: 'italic',
  },
  taskBody: { flex: 1, gap: 2 },
  taskTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
  taskDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  taskMeta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  untimed: { marginTop: 8, paddingTop: 8 },
  untimedLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginLeft: 34,
  },
  empty: {
    paddingVertical: spacing.lg,
    gap: 6,
    alignItems: 'flex-start',
  },
  emptyNode: {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: colors.signal,
    marginBottom: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontFamily: fonts.bodyBold },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
})
