import { format, parseISO } from 'date-fns'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { dateLocale } from '../lib/dateLocale'
import { durationForPriority } from '../lib/scheduleDay'
import { recurrenceLabel } from '../lib/recurrence'
import { useT } from '../lib/useT'

type Props = {
  task: Task
  onToggle?: () => void
  onPress?: () => void
  onPostpone?: () => void
  onMoveTomorrow?: () => void
  /** Hide date in meta when already under a day header */
  hideDate?: boolean
}

export function TaskCard({
  task,
  onToggle,
  onPress,
  onPostpone,
  onMoveTomorrow,
  hideDate,
}: Props) {
  const t = useT()
  const locale = dateLocale(t.language)
  const overdue = isOverdue(task)
  const mins = durationForPriority(task.priority)
  const priorityKey =
    task.priority === 'high'
      ? 'priority.high'
      : task.priority === 'low'
        ? 'priority.low'
        : 'priority.medium'
  const rec = recurrenceLabel(task.recurrence, {
    locale,
    daily: t('editor.daily'),
    weekly: t('editor.weekly'),
  })
  const friendly = (() => {
    if (!task.date) return t('common.noDate')
    try {
      return format(parseISO(`${task.date}T12:00:00`), 'EEE MMM d', { locale })
    } catch {
      return task.date
    }
  })()
  const metaParts = [
    hideDate ? null : friendly,
    task.time || t('common.anytime'),
    `~${mins}m`,
    t(priorityKey),
    rec,
  ].filter(Boolean)

  return (
    <View style={[styles.card, task.completed && styles.done, overdue && styles.overdueCard]}>
      <View style={styles.main}>
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          style={styles.checkWrap}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
        >
          <View style={[styles.check, task.completed && styles.checkOn, overdue && styles.checkOverdue]}>
            {task.completed ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
        </Pressable>
        <Pressable onPress={onPress} style={styles.body} accessibilityRole="button">
          <View style={styles.titleRow}>
            <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
              {task.title}
            </Text>
            {overdue ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('tasks.overdue')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
          {task.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}
        </Pressable>
        <View style={[styles.dot, { backgroundColor: colors[task.priority] }]} />
      </View>

      {!task.completed ? (
        <View style={styles.actions}>
          <Pressable onPress={onPress} style={styles.actionBtn} hitSlop={6} accessibilityRole="button">
            <Text style={styles.actionText}>{t('common.edit')}</Text>
          </Pressable>
          {onPostpone ? (
            <Pressable onPress={onPostpone} style={styles.actionBtn} hitSlop={6}>
              <Text style={styles.actionText}>{t('tasks.plusOneDay')}</Text>
            </Pressable>
          ) : null}
          {onMoveTomorrow ? (
            <Pressable onPress={onMoveTomorrow} style={styles.actionBtn} hitSlop={6}>
              <Text style={styles.actionText}>{t('tasks.postpone')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function isOverdue(task: Task) {
  if (task.completed || !task.date) return false
  const today = format(new Date(), 'yyyy-MM-dd')
  if (task.date < today) return true
  if (task.date > today || !task.time) return false
  const [hh, mm] = task.time.split(':').map(Number)
  const when = new Date()
  when.setHours(hh, mm, 0, 0)
  return when.getTime() < Date.now()
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 4,
  },
  done: { opacity: 0.5 },
  overdueCard: {
    borderBottomColor: 'rgba(196,69,74,0.25)',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  checkWrap: { padding: 2, paddingTop: 2 },
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
  checkOverdue: { borderColor: colors.danger },
  checkMark: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 12 },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, color: colors.text, fontSize: 16, fontFamily: fonts.bodyMedium, lineHeight: 22 },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  badge: {
    backgroundColor: 'rgba(196,69,74,0.12)',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: colors.danger, fontFamily: fonts.bodyBold, fontSize: 10 },
  meta: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.body },
  desc: { color: colors.textDim, fontSize: 13, fontFamily: fonts.body, lineHeight: 18, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 99, marginTop: 8 },
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
