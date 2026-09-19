import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, spacing } from '../constants/theme'

type Props = {
  task: Task
  onToggle?: () => void
  onPress?: () => void
}

const priorityLabel = {
  high: 'High',
  medium: 'Med',
  low: 'Low',
}

export function TaskCard({ task, onToggle, onPress }: Props) {
  const meta = [task.time, priorityLabel[task.priority]].filter(Boolean).join(' · ')

  return (
    <Pressable onPress={onPress} style={[styles.row, task.completed && styles.done]}>
      <View style={[styles.rail, { backgroundColor: colors[task.priority] }]} />
      <Pressable onPress={onToggle} hitSlop={10} style={styles.checkWrap}>
        <View style={[styles.check, task.completed && styles.checkOn]}>
          {task.completed ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, task.completed && styles.titleDone]}>{task.title}</Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  done: { opacity: 0.5 },
  rail: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 2,
  },
  checkWrap: { padding: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 12 },
  title: { color: colors.text, fontSize: 16, fontFamily: fonts.bodyMedium },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  meta: { color: colors.textMuted, marginTop: 3, fontSize: 12, fontFamily: fonts.body },
})
