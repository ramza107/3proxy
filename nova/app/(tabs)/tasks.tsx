import { addDays, format, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TaskCard } from '../../components/TaskCard'
import { colors, radii, spacing } from '../../constants/theme'
import { sortTasks, todayISO, useNovaStore } from '../../lib/store'
import { deleteTask, toggleTaskCompleted, updateTaskFields } from '../../services/ai'
import type { Priority, Task } from '../../types'

type Section = 'today' | 'tomorrow' | 'upcoming' | 'completed'

function labelDate(date: string | null) {
  if (!date) return 'No date'
  try {
    return format(parseISO(date), 'MMM d')
  } catch {
    return date
  }
}

export default function TasksScreen() {
  const tasks = useNovaStore((s) => s.tasks)
  const [section, setSection] = useState<Section>('today')

  const today = todayISO()
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const grouped = useMemo(() => {
    const open = sortTasks(tasks.filter((t) => !t.completed))
    return {
      today: open.filter((t) => t.date === today),
      tomorrow: open.filter((t) => t.date === tomorrow),
      upcoming: open.filter((t) => !t.date || t.date > tomorrow),
      completed: sortTasks(tasks.filter((t) => t.completed)),
    }
  }, [tasks, today, tomorrow])

  useEffect(() => {
    if (grouped[section].length > 0) return
    if (grouped.today.length > 0) {
      setSection('today')
      return
    }
    if (grouped.tomorrow.length > 0) {
      setSection('tomorrow')
      return
    }
    if (grouped.upcoming.length > 0) {
      setSection('upcoming')
    }
  }, [
    section,
    grouped.today.length,
    grouped.tomorrow.length,
    grouped.upcoming.length,
    grouped.completed.length,
  ])

  const visible = grouped[section]

  const onEdit = (task: Task) => {
    Alert.alert(task.title, 'Choose an action', [
      {
        text: task.completed ? 'Mark active' : 'Complete',
        onPress: () => toggleTaskCompleted(task),
      },
      {
        text: 'High priority',
        onPress: () => updateTaskFields(task, { priority: 'high' as Priority }),
      },
      {
        text: 'Move to tomorrow',
        onPress: () => updateTaskFields(task, { date: tomorrow }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask(task.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.sub}>Everything NOVA is tracking for you</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(
          [
            ['today', `Today (${grouped.today.length})`],
            ['tomorrow', `Tomorrow (${grouped.tomorrow.length})`],
            ['upcoming', `Upcoming (${grouped.upcoming.length})`],
            ['completed', `Completed (${grouped.completed.length})`],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setSection(id)}
            style={[styles.tab, section === id && styles.tabOn]}
          >
            <Text style={[styles.tabText, section === id && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>Ask NOVA to create tasks for you.</Text>
          </View>
        ) : (
          visible.map((task) => (
            <View key={task.id} style={{ gap: 4 }}>
              <TaskCard
                task={{
                  ...task,
                  // show friendlier meta through TaskCard's own formatting
                }}
                onToggle={() => toggleTaskCompleted(task)}
                onPress={() => onEdit(task)}
              />
              <Text style={styles.metaLine}>
                {labelDate(task.date)}
                {task.time ? ` · ${task.time}` : ''}
                {` · ${task.priority} priority`}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: 4 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textMuted, marginBottom: 8 },
  tabs: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 8 },
  tab: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '700' },
  tabTextOn: { color: colors.accentStrong },
  list: { padding: spacing.lg, gap: 12, paddingBottom: 40 },
  empty: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  emptyText: { color: colors.textMuted, marginTop: 6 },
  metaLine: { color: colors.textDim, fontSize: 12, marginLeft: 4 },
})
