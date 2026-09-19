import { format, parseISO } from 'date-fns'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  task: Task
  onToggle?: () => void
  onPress?: () => void
  onPostpone?: () => void
  onMoveTomorrow?: () => void
}

const priorityLabel = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
}

function friendlyDate(date: string | null) {
  if (!date) return 'No date'
  try {
    return format(parseISO(date), 'MMM d')
  } catch {
    return date
  }
}

export function TaskCard({ task, onToggle, onPress, onPostpone, onMoveTomorrow }: Props) {
  const meta = [friendlyDate(task.date), task.time, priorityLabel[task.priority]]
    .filter(Boolean)
    .join(' · ')

  return (
    <View style={[styles.card, task.completed && styles.done]}>
      <View style={styles.main}>
        <Pressable
          onPress={onToggle}
          hitSlop={10}
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
          <Text style={styles.meta}>{meta}</Text>
        </Pressable>
        <View style={[styles.dot, { backgroundColor: colors[task.priority] }]} />
      </View>

      {!task.completed ? (
        <View style={styles.actions}>
          <Pressable onPress={onPress} style={styles.actionBtn} hitSlop={6} accessibilityRole="button">
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          {onPostpone ? (
            <Pressable onPress={onPostpone} style={styles.actionBtn} hitSlop={6}>
              <Text style={styles.actionText}>+1 day</Text>
            </Pressable>
          ) : null}
          {onMoveTomorrow ? (
            <Pressable onPress={onMoveTomorrow} style={styles.actionBtn} hitSlop={6}>
              <Text style={styles.actionText}>Tomorrow</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 4,
  },
  done: { opacity: 0.5 },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  checkWrap: { padding: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 12 },
  body: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 16, fontFamily: fonts.bodyMedium },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  meta: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
  dot: { width: 8, height: 8, borderRadius: 99 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 32,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
})
