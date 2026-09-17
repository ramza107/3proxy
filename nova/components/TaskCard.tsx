import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, radii, spacing } from '../constants/theme'

type Props = {
  task: Task
  onToggle?: () => void
  onPress?: () => void
}

const priorityLabel = {
  high: 'High priority',
  medium: 'Medium',
  low: 'Low',
}

export function TaskCard({ task, onToggle, onPress }: Props) {
  const meta = [task.date, task.time, priorityLabel[task.priority]].filter(Boolean).join(' · ')

  return (
    <Pressable onPress={onPress} style={[styles.card, task.completed && styles.done]}>
      <Pressable onPress={onToggle} hitSlop={10} style={styles.checkWrap}>
        <View style={[styles.check, task.completed && styles.checkOn]}>
          {task.completed ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, task.completed && styles.titleDone]}>{task.title}</Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
      <View style={[styles.dot, { backgroundColor: colors[task.priority] }]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  done: { opacity: 0.55 },
  checkWrap: { padding: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: { color: '#0B0D12', fontWeight: '800', fontSize: 13 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 99 },
})
