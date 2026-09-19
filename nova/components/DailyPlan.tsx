import { StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, spacing } from '../constants/theme'
import { TaskCard } from './TaskCard'

type Props = {
  tasks: Task[]
  onToggle: (task: Task) => void
  suggestion?: string
}

export function DailyPlan({ tasks, onToggle, suggestion }: Props) {
  const priority = tasks.filter((t) => t.priority === 'high' && !t.completed)

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.count}>
          {tasks.length === 0 ? 'clear' : `${tasks.length} open`}
        </Text>
      </View>

      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing scheduled</Text>
          <Text style={styles.emptyText}>Dictate or type one thing above.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={() => onToggle(task)} />
          ))}
        </View>
      )}

      <Text style={styles.hint}>
        {suggestion ||
          (priority.length
            ? `${priority.length} high-priority — start there.`
            : tasks.length
              ? 'Say “organize my day” in chat if you want an order.'
              : 'One clear ask beats a long list.')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  count: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  list: {},
  empty: {
    paddingVertical: spacing.md,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.bodyBold,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
})
