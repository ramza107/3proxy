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
            {rec ? (
              <View style={styles.recBadge}>
                <Text style={styles.recBadgeText}>{t('tasks.repeatBadge')}</Text>
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

      {!task.completed && (onPostpone || onMoveTomorrow) ? (
        <View style={styles.actions}>
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

/** Calendar overdue only — past clock-time today is still “today”, not Overdue. */
function isOverdue(task: Task) {
  if (task.completed || !task.date) return false
  const today = format(new Date(), 'yyyy-MM-dd')
  return task.date < today
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 0,
  },
  /** Soften done rows without washing into the painting backdrop. */
  done: { opacity: 0.85 },
  overdueCard: {
    borderBottomColor: 'rgba(196,69,74,0.25)',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  checkWrap: { padding: 2, paddingTop: 1 },
  check: {
    width: 20,
    height: 20,
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
  checkMark: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 11 },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  title: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fonts.bodyMedium, lineHeight: 20 },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  badge: {
    backgroundColor: 'rgba(196,69,74,0.12)',
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: { color: colors.danger, fontFamily: fonts.bodyBold, fontSize: 10 },
  recBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
  },
  recBadgeText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 10 },
  meta: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body },
  desc: { color: colors.textDim, fontSize: 12, fontFamily: fonts.body, lineHeight: 16, marginTop: 1 },
  dot: { width: 7, height: 7, borderRadius: 99, marginTop: 6 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 30,
    paddingBottom: 2,
  },
  actionBtn: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  actionText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
})
