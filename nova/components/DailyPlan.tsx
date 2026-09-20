import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated'
import type { CalendarEvent, Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { durationForPriority, minutesToHm, parseHmToMinutes } from '../lib/scheduleDay'
import { SoftPressable } from './SoftPressable'
import { HomeSection } from './HomeSection'
import { useT } from '../lib/useT'

type Props = {
  tasks: Task[]
  /** Google Calendar events for today (merged onto the rail) */
  events?: CalendarEvent[]
  onToggle: (task: Task) => void
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
  | { kind: 'event'; start: number; end: number; event: CalendarEvent }
  | { kind: 'free'; start: number; end: number }

const NODE: Record<Task['priority'], string> = {
  high: colors.accentStrong,
  medium: colors.accent,
  low: colors.signalMuted,
}

function minutesFromIso(iso: string): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.getHours() * 60 + d.getMinutes()
}

function buildSlots(
  tasks: Task[],
  events: CalendarEvent[],
  workStart: string,
  workEnd: string,
): { timed: Slot[]; untimed: Task[]; allDay: CalendarEvent[] } {
  const start = parseHmToMinutes(workStart) ?? 9 * 60
  const end = parseHmToMinutes(workEnd) ?? 18 * 60
  const open = tasks.filter((t) => !t.completed)
  const withTime = open
    .filter((t) => t.time && parseHmToMinutes(t.time!) != null)
    .map((t) => {
      const s = parseHmToMinutes(t.time!)!
      return { kind: 'task' as const, start: s, end: s + durationForPriority(t.priority), task: t }
    })

  const allDay = events.filter((e) => e.allDay)
  const timedEvents = events
    .filter((e) => !e.allDay)
    .map((e) => {
      const s = minutesFromIso(e.start)
      const en = minutesFromIso(e.end)
      if (s == null) return null
      return {
        kind: 'event' as const,
        start: s,
        end: en != null && en > s ? en : s + 30,
        event: e,
      }
    })
    .filter(Boolean) as Extract<Slot, { kind: 'event' }>[]

  const blocks = [...withTime, ...timedEvents].sort((a, b) => a.start - b.start)
  const untimed = open.filter((t) => !t.time)
  const slots: Slot[] = []
  let cursor = start
  for (const block of blocks) {
    if (block.start > cursor) {
      slots.push({ kind: 'free', start: cursor, end: Math.min(block.start, end) })
    }
    slots.push(block)
    cursor = Math.max(cursor, block.end)
  }
  if (cursor < end) slots.push({ kind: 'free', start: cursor, end })
  return { timed: slots, untimed, allDay }
}

export function DailyPlan({
  tasks,
  events = [],
  onToggle,
  onEdit,
  workdayStart = '09:00',
  workdayEnd = '18:00',
  dayKind = 'work',
  onPlanDay,
  planning,
  suggestion,
}: Props) {
  const t = useT()
  const { timed, untimed, allDay } = useMemo(
    () => buildSlots(tasks, events, workdayStart, workdayEnd),
    [tasks, events, workdayStart, workdayEnd],
  )
  const hasUntimed = untimed.length > 0
  const openCount = tasks.filter((t) => !t.completed).length
  const eventCount = events.length
  const empty = openCount === 0 && eventCount === 0

  return (
    <Animated.View entering={FadeIn.duration(380)} style={styles.wrap}>
      <HomeSection
        title={t('home.today')}
        emphasize
        meta={[
          dayKind === 'light' ? t('home.lightDay') : null,
          `${workdayStart}–${workdayEnd}`,
          openCount ? t.tf('home.openCount', { n: openCount }) : t('home.clear'),
          eventCount
            ? eventCount === 1
              ? t.tf('home.eventOne', { n: 1 })
              : t.tf('home.eventsCount', { n: eventCount })
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          onPlanDay ? (
            <SoftPressable
              style={[
                styles.planBtn,
                (planning || (!hasUntimed && openCount === 0)) && styles.planDisabled,
              ]}
              onPress={onPlanDay}
              disabled={!!planning}
            >
              <Text style={styles.planBtnText}>
                {planning ? t('home.planning') : t('home.planDay')}
              </Text>
            </SoftPressable>
          ) : null
        }
      >
        {empty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('home.emptyToday')}</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            <View style={styles.spine} />
            {allDay.map((ev, i) => (
              <Animated.View
                key={ev.id}
                entering={FadeInRight.delay(Math.min(i, 6) * 30).duration(280)}
                style={styles.row}
              >
                <View style={styles.nodeCol}>
                  <View style={styles.nodeEvent} />
                </View>
                <Text style={styles.timeCol}>Day</Text>
                <View style={styles.taskBody}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <Text style={styles.eventMeta}>Calendar · all day</Text>
                </View>
              </Animated.View>
            ))}
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
                    {t.tf('home.freeMin', { n: Math.max(0, slot.end - slot.start) })}
                  </Text>
                </Animated.View>
              ) : slot.kind === 'event' ? (
                <Animated.View
                  key={slot.event.id}
                  entering={FadeInRight.delay(Math.min(i, 8) * 40).duration(280)}
                  style={styles.row}
                >
                  <View style={styles.nodeCol}>
                    <View style={styles.nodeEvent} />
                  </View>
                  <Text style={styles.timeCol}>{minutesToHm(slot.start)}</Text>
                  <View style={styles.taskBody}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {slot.event.title}
                    </Text>
                    <Text style={styles.eventMeta}>
                      Calendar
                      {slot.event.location ? ` · ${slot.event.location}` : ''}
                      {` · ${Math.max(15, slot.end - slot.start)}m`}
                    </Text>
                  </View>
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
                <Text style={styles.untimedLabel}>{t('home.later')}</Text>
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
          <Text style={styles.hint}>{t('home.planHint')}</Text>
        ) : null}
      </HomeSection>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 0 },
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
    left: 13,
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
  nodeEvent: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: colors.bgDeep,
    marginTop: 2,
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
  eventTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  eventMeta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  untimed: { marginTop: 4, paddingTop: 4 },
  untimedLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 38,
  },
  empty: { paddingVertical: spacing.sm },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
})
