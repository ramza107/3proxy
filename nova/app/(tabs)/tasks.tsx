import { addDays, format, parseISO } from 'date-fns'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../../components/Screen'
import { TaskCard } from '../../components/TaskCard'
import { TaskEditor } from '../../components/TaskEditor'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { anchorsForDay, normalizeTypicalWeek, resolveDayWindow } from '../../lib/scheduleDay'
import { sortTasks, todayISO, uid, useNovaStore } from '../../lib/store'
import { deleteTask, toggleTaskCompleted, updateTaskFields } from '../../services/ai'
import type { Priority, Task } from '../../types'

type DayBucket = {
  iso: string
  label: string
  sub: string
  kind: 'work' | 'light'
  tasks: Task[]
  anchors: { title: string; time: string; durationMin: number }[]
}

function sampleWeekTasks(userId: string, today: string): Task[] {
  const now = new Date().toISOString()
  const mk = (
    title: string,
    offset: number,
    time: string | null,
    priority: Priority,
    description: string,
  ): Task => ({
    id: uid('task'),
    user_id: userId,
    title,
    description,
    date: format(addDays(new Date(`${today}T12:00:00`), offset), 'yyyy-MM-dd'),
    time,
    priority,
    completed: false,
    created_at: now,
    updated_at: now,
  })

  return [
    mk('Morning focus block', 0, '09:30', 'high', 'Deep work before meetings'),
    mk('Inbox triage', 0, '11:00', 'medium', 'Clear Primary + flag asks'),
    mk('Walk / reset', 0, '13:30', 'low', '20 minutes outside'),
    mk('Call Mom', 1, '18:00', 'medium', 'Catch up this evening'),
    mk('Prep weekly plan', 1, null, 'high', 'Sketch next 5 days'),
    mk('Groceries', 2, '17:00', 'low', 'Meat, greens, coffee'),
    mk('Send deck follow-up', 3, '10:00', 'high', 'Promise from last week'),
    mk('Light admin', 4, '11:30', 'low', 'Receipts + calendar hygiene'),
    mk('Weekend planning', 5, '10:00', 'medium', 'What matters this weekend'),
    {
      ...mk('Book dentist', 0, null, 'medium', 'Move onto a real day'),
      date: null,
      title: 'Book dentist',
    },
  ]
}

export default function TasksScreen() {
  const tasks = useNovaStore((s) => s.tasks)
  const settings = useNovaStore((s) => s.settings)
  const userId = useNovaStore((s) => s.sessionUserId) || 'local'
  const setTasks = useNovaStore((s) => s.setTasks)
  const [editing, setEditing] = useState<Task | null>(null)
  const [focusDay, setFocusDay] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)

  const today = todayISO()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const tw = normalizeTypicalWeek(settings.typicalWeek)

  const week = useMemo(() => {
    const open = sortTasks(tasks.filter((t) => !t.completed))
    const days: DayBucket[] = []
    for (let i = 0; i < 7; i++) {
      const iso = format(addDays(new Date(`${today}T12:00:00`), i), 'yyyy-MM-dd')
      const win = resolveDayWindow(settings, iso)
      const label =
        i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(parseISO(iso), 'EEEE')
      const sub = format(parseISO(iso), 'MMM d')
      days.push({
        iso,
        label,
        sub,
        kind: win.kind,
        tasks: open.filter((t) => t.date === iso),
        anchors: anchorsForDay(tw, iso).map((a) => ({
          title: a.title,
          time: a.time,
          durationMin: a.durationMin,
        })),
      })
    }
    return days
  }, [tasks, today, settings, tw])

  const undated = useMemo(
    () => sortTasks(tasks.filter((t) => !t.completed && !t.date)),
    [tasks],
  )
  const overdue = useMemo(
    () =>
      sortTasks(
        tasks.filter((t) => !t.completed && t.date && t.date < today),
      ),
    [tasks, today],
  )
  const completed = useMemo(
    () => sortTasks(tasks.filter((t) => t.completed)).slice(0, 20),
    [tasks],
  )

  const stats = useMemo(() => {
    const open = tasks.filter((t) => !t.completed)
    const weekOpen = open.filter((t) => t.date && t.date >= today && t.date <= week[6]?.iso)
    const timed = open.filter((t) => t.time).length
    return {
      open: open.length,
      overdue: overdue.length,
      week: weekOpen.length,
      timed,
      done: tasks.filter((t) => t.completed).length,
    }
  }, [tasks, overdue.length, today, week])

  const visibleDays = focusDay ? week.filter((d) => d.iso === focusDay) : week

  const postpone = async (task: Task) => {
    const base = task.date || today
    const next = format(addDays(new Date(`${base}T12:00:00`), 1), 'yyyy-MM-dd')
    await updateTaskFields(task, { date: next })
  }

  const fillSampleWeek = () => {
    const sample = sampleWeekTasks(userId, today)
    // Keep existing completed; replace empty open set with sample
    const kept = tasks.filter((t) => t.completed)
    setTasks([...sample, ...kept])
  }

  const emptyWeek =
    stats.open === 0 && week.every((d) => d.anchors.length === 0) && undated.length === 0

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Week on the rail</Text>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.sub}>
            Seven days ahead · edit, shift, complete — anchors from your typical week stay put
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Open" value={stats.open} />
          <Stat label="Overdue" value={stats.overdue} hot={stats.overdue > 0} />
          <Stat label="This week" value={stats.week} />
          <Stat label="Timed" value={stats.timed} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStrip}
        >
          <Pressable
            onPress={() => setFocusDay(null)}
            style={[styles.dayChip, !focusDay && styles.dayChipOn]}
          >
            <Text style={[styles.dayChipLabel, !focusDay && styles.dayChipLabelOn]}>Week</Text>
            <Text style={[styles.dayChipCount, !focusDay && styles.dayChipCountOn]}>
              {stats.week}
            </Text>
          </Pressable>
          {week.map((d) => {
            const on = focusDay === d.iso
            const n = d.tasks.length + d.anchors.length
            return (
              <Pressable
                key={d.iso}
                onPress={() => setFocusDay(on ? null : d.iso)}
                style={[styles.dayChip, on && styles.dayChipOn]}
              >
                <Text style={[styles.dayChipLabel, on && styles.dayChipLabelOn]}>
                  {d.label.slice(0, 3)}
                </Text>
                <Text style={[styles.dayChipSub, on && styles.dayChipSubOn]}>{d.sub}</Text>
                <Text style={[styles.dayChipCount, on && styles.dayChipCountOn]}>{n}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {emptyWeek ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Your week is clear</Text>
              <Text style={styles.emptyText}>
                Add tasks from chat, or drop in a sample week to see how the agenda feels.
              </Text>
              <Pressable style={styles.sampleBtn} onPress={fillSampleWeek}>
                <Text style={styles.sampleBtnText}>Fill sample week</Text>
              </Pressable>
            </View>
          ) : null}

          {overdue.length > 0 && !focusDay ? (
            <View style={styles.dayBlock}>
              <View style={styles.dayHead}>
                <View>
                  <Text style={[styles.dayTitle, styles.overdueTitle]}>Overdue</Text>
                  <Text style={styles.dayMeta}>{overdue.length} still open</Text>
                </View>
              </View>
              {overdue.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskCompleted(task)}
                  onPress={() => setEditing(task)}
                  onPostpone={() => postpone(task)}
                  onMoveTomorrow={() => updateTaskFields(task, { date: tomorrow })}
                />
              ))}
            </View>
          ) : null}

          {visibleDays.map((day) => (
            <View key={day.iso} style={styles.dayBlock}>
              <View style={styles.dayHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayTitle}>
                    {day.label}
                    <Text style={styles.dayTitleMuted}> · {day.sub}</Text>
                  </Text>
                  <Text style={styles.dayMeta}>
                    {day.kind === 'light' ? 'Light day' : 'Workday'}
                    {' · '}
                    {day.tasks.length} task{day.tasks.length === 1 ? '' : 's'}
                    {day.anchors.length
                      ? ` · ${day.anchors.length} anchor${day.anchors.length === 1 ? '' : 's'}`
                      : ''}
                  </Text>
                </View>
              </View>

              {day.anchors.map((a) => (
                <View key={`${day.iso}-${a.title}-${a.time}`} style={styles.anchorRow}>
                  <View style={styles.anchorNode} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.anchorTitle}>{a.title}</Text>
                    <Text style={styles.anchorMeta}>
                      Recurring · {a.time} · {a.durationMin}m
                    </Text>
                  </View>
                </View>
              ))}

              {day.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  hideDate
                  onToggle={() => toggleTaskCompleted(task)}
                  onPress={() => setEditing(task)}
                  onPostpone={() => postpone(task)}
                  onMoveTomorrow={() => updateTaskFields(task, { date: tomorrow })}
                />
              ))}

              {day.tasks.length === 0 && day.anchors.length === 0 ? (
                <Text style={styles.dayEmpty}>Free day on the signal — add a task anytime.</Text>
              ) : null}
            </View>
          ))}

          {undated.length > 0 && !focusDay ? (
            <View style={styles.dayBlock}>
              <View style={styles.dayHead}>
                <View>
                  <Text style={styles.dayTitle}>Later / undated</Text>
                  <Text style={styles.dayMeta}>
                    {undated.length} waiting for a day — Plan day can place them
                  </Text>
                </View>
              </View>
              {undated.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskCompleted(task)}
                  onPress={() => setEditing(task)}
                  onPostpone={() => postpone(task)}
                  onMoveTomorrow={() => updateTaskFields(task, { date: tomorrow })}
                />
              ))}
            </View>
          ) : null}

          <Pressable style={styles.doneToggle} onPress={() => setShowDone((v) => !v)}>
            <Text style={styles.doneToggleText}>
              {showDone ? 'Hide' : 'Show'} done ({stats.done})
            </Text>
          </Pressable>
          {showDone
            ? completed.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskCompleted(task)}
                  onPress={() => setEditing(task)}
                />
              ))
            : null}
        </ScrollView>

        <TaskEditor
          task={editing}
          visible={!!editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (editing) updateTaskFields(editing, patch)
          }}
          onComplete={() => {
            if (editing) {
              toggleTaskCompleted(editing)
              setEditing(null)
            }
          }}
          onDelete={() => {
            if (editing) deleteTask(editing.id)
          }}
        />
      </SafeAreaView>
    </Screen>
  )
}

function Stat({ label, value, hot }: { label: string; value: number; hot?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, hot && styles.statHot]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 4,
    marginBottom: 10,
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
    fontSize: 34,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  sub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
  },
  statHot: { color: colors.danger },
  statLabel: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  weekStrip: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingBottom: 10,
  },
  dayChip: {
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: 2,
  },
  dayChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  dayChipLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  dayChipLabelOn: { color: colors.accentStrong },
  dayChipSub: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  dayChipSubOn: { color: colors.accentStrong },
  dayChipCount: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginTop: 2,
  },
  dayChipCountOn: { color: colors.accentStrong },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 4,
    paddingBottom: 48,
  },
  dayBlock: {
    marginBottom: 18,
    gap: 4,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dayTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  dayTitleMuted: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  overdueTitle: { color: colors.danger },
  dayMeta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  dayEmpty: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    paddingVertical: 8,
    paddingLeft: 4,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    opacity: 0.85,
  },
  anchorNode: {
    width: 10,
    height: 10,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: colors.signalMuted,
    marginTop: 5,
    marginLeft: 6,
  },
  anchorTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  anchorMeta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    paddingVertical: spacing.lg,
    gap: 8,
    marginBottom: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  sampleBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBtnText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  doneToggle: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneToggleText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
})
