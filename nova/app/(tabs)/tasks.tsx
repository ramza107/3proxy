import { addDays, format, parseISO } from 'date-fns'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { FAB_RIGHT, FAB_SCROLL_INSET, FAB_SIZE, localFabBottom } from '../../components/ChatFab'
import { Screen } from '../../components/Screen'
import { ScreenHeader } from '../../components/ScreenHeader'
import { HomeSection } from '../../components/HomeSection'
import { SoftPressable } from '../../components/SoftPressable'
import { TaskCard } from '../../components/TaskCard'
import { TaskEditor } from '../../components/TaskEditor'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { dateLocale } from '../../lib/dateLocale'
import { anchorsForDay, normalizeTypicalWeek, resolveDayWindow } from '../../lib/scheduleDay'
import { sortTasks, todayISO, uid, useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import { deleteTask, toggleTaskCompleted, updateTaskFields } from '../../services/ai'
import type { Priority, Task } from '../../types'

type DayBucket = {
  iso: string
  label: string
  sub: string
  short: string
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
    mk('Plan afternoon focus', 0, '11:00', 'medium', 'Block deep work after standup'),
    mk('Walk / reset', 0, '13:30', 'low', '20 minutes outside'),
    mk('Call Mom', 1, '18:00', 'medium', 'Catch up this evening'),
    mk('Prep weekly plan', 1, null, 'high', 'Sketch next 5 days'),
    mk('Groceries', 2, '17:00', 'low', 'Meat, greens, coffee'),
    mk('Send deck follow-up', 3, '10:00', 'high', 'Open loop from last week'),
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
  const t = useT()
  const insets = useSafeAreaInsets()
  const { taskId } = useLocalSearchParams<{ taskId?: string }>()
  const tasks = useNovaStore((s) => s.tasks)
  const settings = useNovaStore((s) => s.settings)
  const userId = useNovaStore((s) => s.sessionUserId) || 'local'
  const setTasks = useNovaStore((s) => s.setTasks)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const clearCompletedTasks = useNovaStore((s) => s.clearCompletedTasks)
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [createDate, setCreateDate] = useState<string | null>(null)
  const [focusDay, setFocusDay] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const listRef = useRef<ScrollView>(null)

  const openCreate = (date: string | null = focusDay || todayISO()) => {
    setEditing(null)
    setCreateDate(date)
    setCreating(true)
  }

  // Each day chip should open from the top — don't keep the previous day's scroll.
  useEffect(() => {
    listRef.current?.scrollTo({ y: 0, animated: false })
  }, [focusDay])

  useEffect(() => {
    if (!taskId || typeof taskId !== 'string') return
    const found = tasks.find((t) => t.id === taskId)
    if (found) setEditing(found)
  }, [taskId, tasks])

  const today = todayISO()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const tw = normalizeTypicalWeek(settings.typicalWeek)
  const locale = dateLocale(t.language)

  const week = useMemo(() => {
    const open = sortTasks(tasks.filter((t) => !t.completed))
    const days: DayBucket[] = []
    for (let i = 0; i < 7; i++) {
      const iso = format(addDays(new Date(`${today}T12:00:00`), i), 'yyyy-MM-dd')
      const win = resolveDayWindow(settings, iso)
      const d = parseISO(`${iso}T12:00:00`)
      const label =
        i === 0 ? t('common.today') : i === 1 ? t('common.tomorrow') : format(d, 'EEEE', { locale })
      const sub = format(d, 'MMM d', { locale })
      const short =
        i === 0
          ? t('common.today').slice(0, 3)
          : i === 1
            ? t('common.tomorrow').slice(0, 3)
            : format(d, 'EEE', { locale })
      days.push({
        iso,
        label,
        sub,
        short,
        kind: win.kind,
        tasks: open.filter((task) => task.date === iso),
        anchors: anchorsForDay(tw, iso).map((a) => ({
          title: a.title,
          time: a.time,
          durationMin: a.durationMin,
        })),
      })
    }
    return days
  }, [tasks, today, settings, tw, t, locale])

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
        <ScreenHeader kicker={t('tasks.kicker')} title={t('tasks.title')} sub={t('tasks.sub')}>
          <Text style={styles.statsLine}>
            <Text style={styles.statsStrong}>{stats.open}</Text>
            {` ${t('tasks.statOpen').toLowerCase()}`}
            {' · '}
            <Text style={stats.overdue > 0 ? styles.statsHot : styles.statsStrong}>{stats.overdue}</Text>
            {` ${t('tasks.statOverdue').toLowerCase()}`}
            {' · '}
            <Text style={styles.statsStrong}>{stats.week}</Text>
            {` ${t('tasks.statWeek').toLowerCase()}`}
            {' · '}
            <Text style={styles.statsStrong}>{stats.timed}</Text>
            {` ${t('tasks.statTimed').toLowerCase()}`}
          </Text>
        </ScreenHeader>

        <View style={styles.weekStripOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weekStripScroll}
            contentContainerStyle={styles.weekStrip}
          >
            <Pressable
              onPress={() => setFocusDay(null)}
              style={[styles.dayChip, !focusDay && styles.dayChipOn]}
            >
              <Text style={[styles.dayChipLabel, !focusDay && styles.dayChipLabelOn]} numberOfLines={1}>
                {t('tasks.week')}
              </Text>
              <Text style={styles.dayChipSub} numberOfLines={1}>
                {' '}
              </Text>
              <Text style={[styles.dayChipCount, !focusDay && styles.dayChipCountOn]} numberOfLines={1}>
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
                  accessibilityLabel={`${d.label} ${d.sub}, ${n}`}
                >
                  <Text style={[styles.dayChipLabel, on && styles.dayChipLabelOn]} numberOfLines={1}>
                    {d.short}
                  </Text>
                  <Text style={[styles.dayChipSub, on && styles.dayChipSubOn]} numberOfLines={1}>
                    {d.sub}
                  </Text>
                  <Text style={[styles.dayChipCount, on && styles.dayChipCountOn]} numberOfLines={1}>
                    {n}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        <ScrollView
          ref={listRef}
          style={styles.listScroll}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {emptyWeek ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('tasks.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('tasks.emptyText')}</Text>
              <Pressable style={styles.sampleBtn} onPress={fillSampleWeek}>
                <Text style={styles.sampleBtnText}>{t('tasks.fillSample')}</Text>
              </Pressable>
            </View>
          ) : null}

          {overdue.length > 0 && !focusDay ? (
            <HomeSection
              title={t('tasks.overdue')}
              meta={t.tf('tasks.overdueMeta', { n: overdue.length })}
              emphasize
            >
              {overdue.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskCompleted(task)}
                  onPress={() => setEditing(task)}
                  onMoveTomorrow={() => updateTaskFields(task, { date: tomorrow })}
                />
              ))}
            </HomeSection>
          ) : null}

          {visibleDays.map((day) => {
            const kindLabel = day.kind === 'light' ? t('tasks.light') : t('tasks.work')
            const taskMeta =
              day.tasks.length === 1
                ? t.tf('tasks.taskOne', { n: day.tasks.length })
                : t.tf('tasks.taskCount', { n: day.tasks.length })
            const anchorMeta = day.anchors.length
              ? day.anchors.length === 1
                ? ` · ${t.tf('tasks.anchorOne', { n: day.anchors.length })}`
                : ` · ${t.tf('tasks.anchorCount', { n: day.anchors.length })}`
              : ''
            return (
            <HomeSection
              key={day.iso}
              title={day.label}
              meta={`${day.sub} · ${kindLabel} · ${taskMeta}${anchorMeta}`}
              emphasize={day.iso === today}
            >
              {day.anchors.map((a) => (
                <View key={`${day.iso}-${a.title}-${a.time}`} style={styles.anchorRow}>
                  <View style={styles.anchorNode} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.anchorTitle}>{a.title}</Text>
                    <Text style={styles.anchorMeta}>
                      {t('tasks.recurring')} · {a.time} · {a.durationMin}m
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
                  {...(day.iso === today
                    ? {
                        onMoveTomorrow: () =>
                          updateTaskFields(task, { date: tomorrow }),
                      }
                    : {
                        onPostpone: () => postpone(task),
                      })}
                />
              ))}

              {day.tasks.length === 0 && day.anchors.length === 0 ? (
                <Text style={styles.dayEmpty}>{t('tasks.freeDay')}</Text>
              ) : null}

              <Pressable
                style={styles.addDayBtn}
                onPress={() => openCreate(day.iso)}
                accessibilityRole="button"
                hitSlop={6}
              >
                <Text style={styles.addDayBtnText}>+ {t('tasks.addTask')}</Text>
              </Pressable>
            </HomeSection>
            )
          })}

          {undated.length > 0 && !focusDay ? (
            <HomeSection
              title={t('tasks.later')}
              meta={t.tf('tasks.laterMeta', { n: undated.length })}
            >
              {undated.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskCompleted(task)}
                  onPress={() => setEditing(task)}
                  onMoveTomorrow={() => updateTaskFields(task, { date: tomorrow })}
                />
              ))}
            </HomeSection>
          ) : null}

          {stats.done > 0 ? (
            showDone ? (
              <HomeSection
                title={t('tasks.completed')}
                meta={t.tf('tasks.doneMeta', { n: stats.done })}
                action={
                  <View style={styles.doneActions}>
                    <Pressable
                      onPress={() => {
                        Alert.alert(t('tasks.clearDoneTitle'), t.tf('tasks.clearDoneBody', { n: stats.done }), [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('tasks.clearDoneConfirm'),
                            style: 'destructive',
                            onPress: () => {
                              clearCompletedTasks()
                              setShowDone(false)
                            },
                          },
                        ])
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.clearDone}>{t('tasks.clearDone')}</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowDone(false)} hitSlop={8}>
                      <Text style={styles.hideDone}>{t('tasks.hideDone')}</Text>
                    </Pressable>
                  </View>
                }
              >
                {completed.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTaskCompleted(task)}
                    onPress={() => setEditing(task)}
                  />
                ))}
                {stats.done > completed.length ? (
                  <Text style={styles.doneMore}>
                    +{stats.done - completed.length}
                  </Text>
                ) : null}
              </HomeSection>
            ) : (
              <View style={styles.doneToggle}>
                <Pressable
                  style={styles.doneToggleShow}
                  onPress={() => setShowDone(true)}
                  hitSlop={6}
                >
                  <Text style={styles.doneToggleText}>
                    {t('tasks.showDone')} · {stats.done}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.alert(t('tasks.clearDoneTitle'), t.tf('tasks.clearDoneBody', { n: stats.done }), [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('tasks.clearDoneConfirm'),
                        style: 'destructive',
                        onPress: () => clearCompletedTasks(),
                      },
                    ])
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.clearDone}>{t('tasks.clearDone')}</Text>
                </Pressable>
              </View>
            )
          ) : null}
        </ScrollView>

        <SoftPressable
          style={[
            styles.fab,
            {
              bottom: localFabBottom(insets.bottom),
              right: FAB_RIGHT,
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: FAB_SIZE / 2,
            },
          ]}
          onPress={() => openCreate(focusDay || todayISO())}
          accessibilityRole="button"
        >
          <Text style={styles.fabText}>+</Text>
        </SoftPressable>

        <TaskEditor
          task={editing}
          creating={creating}
          initialDate={createDate}
          visible={creating || !!editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
            setCreateDate(null)
          }}
          onSave={(patch) => {
            if (creating) {
              createTaskLocal({
                title: patch.title || 'Task',
                date: patch.date ?? createDate,
                time: patch.time ?? null,
                priority: patch.priority || 'medium',
                recurrence: patch.recurrence ?? null,
                userId,
              })
              return
            }
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 6,
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
    fontSize: 32,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  headerCopy: {
    backgroundColor: 'rgba(250,252,251,0.94)',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  sub: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  statsLine: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  statsStrong: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontVariant: ['tabular-nums'],
  },
  statsHot: {
    color: colors.danger,
    fontFamily: fonts.bodyBold,
    fontVariant: ['tabular-nums'],
  },
  // Keep the strip out of the flex squeeze: list ScrollView takes remaining height,
  // strip never shrinks — otherwise RN Web clips the chip count digits.
  weekStripOuter: {
    height: 96,
    minHeight: 96,
    maxHeight: 96,
    flexGrow: 0,
    flexShrink: 0,
    marginHorizontal: spacing.lg,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  weekStripScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 96,
    minHeight: 96,
  },
  weekStrip: {
    paddingHorizontal: spacing.sm,
    gap: 6,
    alignItems: 'center',
    height: 96,
    paddingVertical: 6,
  },
  dayChip: {
    width: 64,
    height: 84,
    minHeight: 84,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  dayChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  dayChipLabel: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    height: 14,
    textAlign: 'center',
    width: '100%',
  },
  dayChipLabelOn: { color: colors.accentStrong },
  dayChipSub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 12,
    height: 12,
    textAlign: 'center',
    width: '100%',
  },
  dayChipSubOn: { color: colors.accentStrong },
  dayChipCount: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    height: 18,
    textAlign: 'center',
    width: '100%',
    fontVariant: ['tabular-nums'],
  },
  dayChipCountOn: { color: colors.accentStrong },
  listScroll: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    paddingBottom: FAB_SCROLL_INSET,
  },
  dayEmpty: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    paddingVertical: 2,
  },
  addDayBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDayBtnText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 96,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 40,
  },
  fabText: {
    color: colors.textOnAccent,
    fontSize: 28,
    fontFamily: fonts.bodyBold,
    marginTop: -2,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    opacity: 0.85,
  },
  anchorNode: {
    width: 9,
    height: 9,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: colors.signalMuted,
    marginTop: 4,
    marginLeft: 2,
  },
  anchorTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  anchorMeta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  empty: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(250,252,251,0.94)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(250,252,251,0.94)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: 4,
  },
  doneToggleShow: { flex: 1 },
  doneActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clearDone: {
    color: colors.danger,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  hideDone: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  doneMore: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    paddingTop: 4,
  },
  doneToggleText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
})
