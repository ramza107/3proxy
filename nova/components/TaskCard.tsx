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
      <Pressable onPress={onPress} style={styles.main}>
        <Pressable onPress={onToggle} hitSlop={10} style={styles.checkWrap}>
          <View style={[styles.check, task.completed && styles.checkOn]}>
            {task.completed ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
        </Pressable>
        <View style={styles.body}>
          <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: colors[task.priority] }]} />
      </Pressable>

      {!task.completed ? (
        <View style={styles.actions}>
          <Pressable onPress={onPress} style={styles.actionBtn} hitSlop={6}>
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
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  done: { opacity: 0.55 },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  checkWrap: { padding: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  body: { flex: 1, gap: 3 },
  title: { color: colors.text, fontSize: 16, fontFamily: fonts.bodyMedium },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  meta: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
  dot: { width: 8, height: 8, borderRadius: 99 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  actionBtn: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
})
