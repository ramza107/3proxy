import { addDays, format, parseISO } from 'date-fns'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../../components/Screen'
import { TaskCard } from '../../components/TaskCard'
import { TaskPanel } from '../../components/TaskPanel'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { sortTasks, todayISO, useNovaStore } from '../../lib/store'
import { deleteTask, toggleTaskCompleted, updateTaskFields } from '../../services/ai'
import type { Priority, Task } from '../../types'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type Filter = 'today' | 'tomorrow' | 'upcoming' | 'done'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'upcoming', label: 'Later' },
  { id: 'done', label: 'Done' },
]

function friendlyDate(date: string | null) {
  if (!date) return 'No date'
  try {
    return format(parseISO(date), 'EEE, MMM d')
  } catch {
    return date
  }
}

function animateList() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
}

export default function TasksScreen() {
  const router = useRouter()
  const tasks = useNovaStore((s) => s.tasks)
  const [filter, setFilter] = useState<Filter>('today')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const today = todayISO()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const buckets = useMemo(() => {
    const open = sortTasks(tasks.filter((t) => !t.completed))
    const overdue = open.filter((t) => Boolean(t.date && t.date < today))
    const todayList = open.filter((t) => t.date === today)
    const tomorrowList = open.filter((t) => t.date === tomorrow)
    const upcoming = open.filter((t) => !t.date || t.date > tomorrow)
    const done = sortTasks(tasks.filter((t) => t.completed))
    return { overdue, today: todayList, tomorrow: tomorrowList, upcoming, done }
  }, [tasks, today, tomorrow])

  const counts: Record<Filter, number> = {
    today: buckets.today.length + buckets.overdue.length,
    tomorrow: buckets.tomorrow.length,
    upcoming: buckets.upcoming.length,
    done: buckets.done.length,
  }

  const openCount = tasks.filter((t) => !t.completed).length
  const highToday = buckets.today.filter((t) => t.priority === 'high').length

  const visible: { title?: string; items: Task[] }[] = useMemo(() => {
    if (filter === 'today') {
      const sections: { title?: string; items: Task[] }[] = []
      if (buckets.overdue.length) sections.push({ title: 'Overdue', items: buckets.overdue })
      sections.push({
        title: buckets.overdue.length ? 'Today' : undefined,
        items: buckets.today,
      })
      return sections
    }
    if (filter === 'tomorrow') return [{ items: buckets.tomorrow }]
    if (filter === 'upcoming') return [{ items: buckets.upcoming }]
    return [{ items: buckets.done }]
  }, [filter, buckets])

  const totalVisible = visible.reduce((n, s) => n + s.items.length, 0)

  const setFilterAnimated = (next: Filter) => {
    animateList()
    setExpandedId(null)
    setFilter(next)
  }

  const onToggleComplete = async (task: Task) => {
    animateList()
    const result = await toggleTaskCompleted(task)
    if (result?.rolled) {
      Alert.alert(
        'Next month',
        `"${task.title}" is set again for ${friendlyDate(result.task.date)}. Shopping ticks were cleared.`,
      )
    }
  }

  const onMore = (task: Task) => {
    Alert.alert(task.title, `${friendlyDate(task.date)}${task.time ? ` · ${task.time}` : ''}`, [
      {
        text: task.completed ? 'Mark active' : task.recurrence ? 'Complete this month' : 'Complete',
        onPress: () => onToggleComplete(task),
      },
      {
        text: 'High priority',
        onPress: () => updateTaskFields(task, { priority: 'high' as Priority }),
      },
      {
        text: 'Move to tomorrow',
        onPress: () => {
          animateList()
          updateTaskFields(task, { date: tomorrow })
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          animateList()
          setExpandedId(null)
          deleteTask(task.id)
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const emptyCopy =
    filter === 'done'
      ? {
          title: 'No completed tasks yet',
          body: 'Finish something today — it will land here.',
          cta: 'Go to Today',
          action: () => setFilterAnimated('today'),
        }
      : filter === 'tomorrow'
        ? {
            title: 'Tomorrow is open',
            body: 'Ask Wahrly to schedule something for tomorrow.',
            cta: 'Ask Wahrly',
            action: () => router.push('/chat'),
          }
        : filter === 'upcoming'
          ? {
              title: 'Nothing further out',
              body: 'Try: “Every month on the 15th pay rent”.',
              cta: 'Ask Wahrly',
              action: () => router.push('/chat'),
            }
          : {
              title: 'Your day is clear',
              body: 'Try: “Buy groceries: milk, bread, eggs” — then tick items in the list.',
              cta: 'Ask Wahrly',
              action: () => router.push('/chat'),
            }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Tasks</Text>
            <Pressable
              onPress={() => router.push('/chat')}
              style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Ask Wahrly to add a task"
            >
              <Text style={styles.addBtnPlus}>+</Text>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          <Text style={styles.sub}>
            {openCount === 0
              ? 'Nothing open — a calm slate'
              : `${openCount} open${highToday ? ` · ${highToday} high today` : ''}`}
          </Text>
        </View>

        <View style={styles.filterBar}>
          {FILTERS.map((f) => {
            const on = filter === f.id
            const count = counts[f.id]
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilterAnimated(f.id)}
                style={[styles.filterChip, on && styles.filterChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.filterLabel, on && styles.filterLabelOn]}>{f.label}</Text>
                <View style={[styles.countPill, on && styles.countPillOn]}>
                  <Text style={[styles.countText, on && styles.countTextOn]}>{count}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {totalVisible === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEyebrow}>Wahrly</Text>
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyBody}>{emptyCopy.body}</Text>
              <Pressable
                onPress={emptyCopy.action}
                style={({ pressed }) => [styles.emptyCta, pressed && styles.emptyCtaPressed]}
              >
                <Text style={styles.emptyCtaText}>{emptyCopy.cta}</Text>
              </Pressable>
            </View>
          ) : (
            visible.map((section, idx) =>
              section.items.length === 0 ? null : (
                <View key={section.title || `sec-${idx}`} style={styles.section}>
                  {section.title ? (
                    <Text
                      style={[
                        styles.sectionLabel,
                        section.title === 'Overdue' && styles.sectionLabelOverdue,
                      ]}
                    >
                      {section.title}
                    </Text>
                  ) : null}
                  <View style={styles.sectionList}>
                    {section.items.map((task) => {
                      const open = expandedId === task.id
                      return (
                        <View key={task.id} style={styles.taskBlock}>
                          <TaskCard
                            task={task}
                            dateLabel={friendlyDate(task.date)}
                            expanded={open}
                            onToggle={() => onToggleComplete(task)}
                            onPress={() => {
                              setExpandedId(open ? null : task.id)
                            }}
                          />
                          {open ? (
                            <View>
                              <TaskPanel taskId={task.id} />
                              <Pressable onPress={() => onMore(task)} style={styles.moreBtn}>
                                <Text style={styles.moreText}>More actions</Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      )
                    })}
                  </View>
                </View>
              ),
            )
          )}

          {totalVisible > 0 ? (
            <Pressable
              onPress={() => router.push('/chat')}
              style={({ pressed }) => [styles.footerAsk, pressed && styles.footerAskPressed]}
            >
              <Text style={styles.footerAskText}>Ask Wahrly to adjust your list</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  sub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgDeep,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  addBtnPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  addBtnPlus: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    lineHeight: 20,
  },
  addBtnText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  filterBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radii.sm,
    gap: 4,
  },
  filterChipOn: {
    backgroundColor: colors.bgDeep,
  },
  filterLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  filterLabelOn: {
    color: colors.textOnAccent,
  },
  countPill: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
  },
  countPillOn: {
    backgroundColor: 'rgba(247,251,250,0.18)',
  },
  countText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  countTextOn: {
    color: colors.textOnAccent,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
    gap: spacing.lg,
  },
  section: { gap: spacing.sm },
  sectionLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
  sectionLabelOverdue: {
    color: colors.danger,
  },
  sectionList: { gap: 10 },
  taskBlock: { gap: 8 },
  moreBtn: { alignItems: 'center', paddingBottom: 4 },
  moreText: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  empty: {
    marginTop: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
    gap: 10,
  },
  emptyEyebrow: {
    color: colors.accentStrong,
    fontFamily: fonts.brandItalic,
    fontSize: 15,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.4,
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  emptyCta: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radii.full,
  },
  emptyCtaPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  emptyCtaText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  footerAsk: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  footerAskPressed: { opacity: 0.7 },
  footerAskText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
})
