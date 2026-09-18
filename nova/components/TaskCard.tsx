import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { checklistProgress, recurrenceLabel } from '../lib/taskExtras'

type Props = {
  task: Task
  dateLabel?: string
  expanded?: boolean
  onToggle?: () => void
  onPress?: () => void
}

const priorityLabel = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function TaskCard({ task, dateLabel, expanded, onToggle, onPress }: Props) {
  const when = [dateLabel || task.date, task.time].filter(Boolean).join(' · ')
  const progress = checklistProgress(task.checklist)
  const monthly = recurrenceLabel(task.recurrence)
  const bits = [
    when,
    priorityLabel[task.priority],
    progress ? `${progress.done}/${progress.total} items` : null,
    monthly ? 'Monthly' : null,
  ].filter(Boolean)
  const meta = bits.join(' · ')

  return (
    <View style={[styles.card, task.completed && styles.done, expanded && styles.expanded]}>
      <Pressable
        onPress={onToggle}
        hitSlop={12}
        style={styles.checkWrap}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
      >
        <View style={[styles.check, task.completed && styles.checkOn]}>
          {task.completed ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable onPress={onPress} style={styles.body} accessibilityRole="button">
        <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
      </Pressable>
      <Pressable
        onPress={onPress}
        style={styles.expandBtn}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide details' : 'Show list and repeat'}
      >
        <Text style={styles.expandText}>{expanded ? '▴' : '▾'}</Text>
      </Pressable>
      <View style={[styles.priority, { backgroundColor: colors[task.priority] }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expanded: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  done: { opacity: 0.58 },
  checkWrap: { padding: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  body: { flex: 1, gap: 3 },
  title: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    lineHeight: 21,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  priority: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
})
