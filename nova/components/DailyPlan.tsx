import { StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, radii, spacing } from '../constants/theme'
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
      <Text style={styles.label}>TODAY</Text>
      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Your day is clear</Text>
          <Text style={styles.emptyText}>Tell Wahrly what you need to get done.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={() => onToggle(task)} />
          ))}
        </View>
      )}

      <View style={styles.suggestion}>
        <Text style={styles.label}>AI SUGGESTION</Text>
        <Text style={styles.suggestionText}>
          {suggestion ||
            (priority.length
              ? `You have ${priority.length} important thing${priority.length > 1 ? 's' : ''} today. I can organize them for you.`
              : tasks.length
                ? `You have ${tasks.length} thing${tasks.length > 1 ? 's' : ''} today. I can help you prioritize.`
                : 'Start by telling me one thing you want done today.')}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  label: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  list: { gap: 10 },
  empty: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  suggestion: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 8,
  },
  suggestionText: { color: colors.text, fontSize: 15, lineHeight: 22 },
})
