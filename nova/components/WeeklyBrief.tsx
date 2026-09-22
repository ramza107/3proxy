import { format, parseISO } from 'date-fns'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { formatMoney } from '../lib/bills'
import { dateLocale } from '../lib/dateLocale'
import {
  billsDueThisWeek,
  focusTitles,
  unfinishedThisWeek,
  weekMonday,
  weekSunday,
} from '../lib/weekRange'
import { useNovaStore } from '../lib/store'
import { useT } from '../lib/useT'
import { SoftPressable } from './SoftPressable'

type Props = {
  onClose: () => void
  onPlanDay?: () => void
  onOpenBills?: () => void
  onOpenTasks?: () => void
}

/** Monday overview: unfinished week, bills due, three focuses. */
export function WeeklyBrief({ onClose, onPlanDay, onOpenBills, onOpenTasks }: Props) {
  const t = useT()
  const tasks = useNovaStore((s) => s.tasks)
  const bills = useNovaStore((s) => s.bills)
  const day = format(new Date(), 'yyyy-MM-dd')
  const from = weekMonday(day)
  const to = weekSunday(day)
  const open = unfinishedThisWeek(tasks, day)
  const dueBills = billsDueThisWeek(bills, day)
  const focuses = focusTitles(tasks, 3)
  const locale = dateLocale(t.language)

  const rangeLabel = `${format(parseISO(`${from}T12:00:00`), 'MMM d', { locale })} – ${format(
    parseISO(`${to}T12:00:00`),
    'MMM d',
    { locale },
  )}`

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>This week</Text>
      <Text style={styles.range}>{rangeLabel}</Text>

      <Text style={styles.section}>Focus</Text>
      {focuses.length === 0 ? (
        <Text style={styles.empty}>No open tasks yet — add what matters most.</Text>
      ) : (
        focuses.map((title, i) => (
          <View key={`${title}-${i}`} style={styles.focusRow}>
            <Text style={styles.focusNum}>{i + 1}</Text>
            <Text style={styles.focusTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Still open · {open.length}</Text>
      {open.length === 0 ? (
        <Text style={styles.empty}>Week looks clear.</Text>
      ) : (
        open.slice(0, 6).map((task) => (
          <Text key={task.id} style={styles.line} numberOfLines={1}>
            {task.date ? `${task.date.slice(5)} · ` : ''}
            {task.title}
          </Text>
        ))
      )}
      {open.length > 6 ? <Text style={styles.more}>+{open.length - 6} more</Text> : null}

      <Text style={styles.section}>Bills this week · {dueBills.length}</Text>
      {dueBills.length === 0 ? (
        <Text style={styles.empty}>No unpaid bills due this week.</Text>
      ) : (
        dueBills.map((b) => (
          <Text key={b.id} style={styles.line} numberOfLines={1}>
            {b.title} · {formatMoney(b.amount, b.currency)} · day {b.dayOfMonth}
          </Text>
        ))
      )}

      <View style={styles.actions}>
        {onPlanDay ? (
          <SoftPressable style={styles.primary} onPress={onPlanDay}>
            <Text style={styles.primaryText}>Plan today</Text>
          </SoftPressable>
        ) : null}
        <View style={styles.row}>
          {onOpenTasks ? (
            <Pressable style={styles.secondary} onPress={onOpenTasks}>
              <Text style={styles.secondaryText}>Tasks</Text>
            </Pressable>
          ) : null}
          {onOpenBills ? (
            <Pressable style={styles.secondary} onPress={onOpenBills}>
              <Text style={styles.secondaryText}>Bills</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={onClose} style={styles.dismiss}>
          <Text style={styles.dismissText}>Got it</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  range: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  section: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  focusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  focusNum: {
    width: 22,
    height: 22,
    borderRadius: 99,
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: colors.accentSoft,
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    overflow: 'hidden',
  },
  focusTitle: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  line: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, paddingVertical: 3 },
  more: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  actions: { marginTop: spacing.md, gap: 8 },
  primary: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  secondary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 14 },
  dismiss: { alignItems: 'center', paddingVertical: 12 },
  dismissText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 14 },
})
