import { addDays, format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../../components/Screen'
import { TaskCard } from '../../components/TaskCard'
import { TaskEditor } from '../../components/TaskEditor'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { sortTasks, todayISO, useNovaStore } from '../../lib/store'
import { deleteTask, toggleTaskCompleted, updateTaskFields } from '../../services/ai'
import type { Task } from '../../types'

type Section = 'today' | 'tomorrow' | 'upcoming' | 'completed'

export default function TasksScreen() {
  const tasks = useNovaStore((s) => s.tasks)
  const [section, setSection] = useState<Section>('today')
  const [editing, setEditing] = useState<Task | null>(null)

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

  const visible = grouped[section]

  const postpone = async (task: Task) => {
    const base = task.date || today
    const next = format(addDays(new Date(`${base}T12:00:00`), 1), 'yyyy-MM-dd')
    await updateTaskFields(task, { date: next })
  }

  const tabs = [
    ['today', 'Today', grouped.today.length],
    ['tomorrow', 'Tomorrow', grouped.tomorrow.length],
    ['upcoming', 'Upcoming', grouped.upcoming.length],
    ['completed', 'Done', grouped.completed.length],
  ] as const

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>On the rail</Text>
          <Text style={styles.title}>Tasks</Text>
          <Text style={styles.sub}>Edit, postpone, or move anything on your signal</Text>
        </View>

        <View style={styles.tabs}>
          {tabs.map(([id, label, count]) => {
            const on = section === id
            return (
              <Pressable
                key={id}
                onPress={() => setSection(id)}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{label}</Text>
                <Text style={[styles.tabCount, on && styles.tabCountOn]}>{count}</Text>
              </Pressable>
            )
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {visible.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing here</Text>
              <Text style={styles.emptyText}>
                Ask Wahrly in chat, or move a task here with Edit → Today / Tomorrow.
              </Text>
            </View>
          ) : (
            visible.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleTaskCompleted(task)}
                onPress={() => setEditing(task)}
                onPostpone={() => postpone(task)}
                onMoveTomorrow={() => updateTaskFields(task, { date: tomorrow })}
              />
            ))
          )}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 4,
    marginBottom: 12,
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
  sub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  tabOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  tabTextOn: { color: colors.accentStrong },
  tabCount: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    minWidth: 14,
    textAlign: 'center',
  },
  tabCountOn: { color: colors.accentStrong },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 10,
    paddingBottom: 48,
  },
  empty: {
    paddingVertical: spacing.lg,
    gap: 6,
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
})
