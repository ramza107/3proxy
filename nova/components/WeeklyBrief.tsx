import { format, parseISO } from 'date-fns'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
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
    <Animated.View entering={FadeIn.duration(360)} style={styles.wrap}>
      <Text style={styles.kicker}>{t('weekly.kicker')}</Text>
      <Text style={styles.range}>{rangeLabel}</Text>

      <Text style={styles.section}>{t('weekly.focus')}</Text>
      {focuses.length === 0 ? (
        <Text style={styles.empty}>{t('weekly.focusEmpty')}</Text>
      ) : (
        focuses.map((title, i) => (
          <Animated.View
            key={`${title}-${i}`}
            entering={FadeInDown.delay(80 + i * 50).duration(320)}
            style={styles.focusRow}
          >
            <Text style={styles.focusNum}>{i + 1}</Text>
            <Text style={styles.focusTitle} numberOfLines={2}>
              {title}
            </Text>
          </Animated.View>
        ))
      )}

      <Text style={styles.section}>{t.tf('weekly.stillOpen', { n: open.length })}</Text>
      {open.length === 0 ? (
        <Text style={styles.empty}>{t('weekly.clear')}</Text>
      ) : (
        open.slice(0, 6).map((task, i) => (
          <Animated.Text
            key={task.id}
            entering={FadeInDown.delay(120 + i * 35).duration(280)}
            style={styles.line}
            numberOfLines={1}
          >
            {task.date ? `${task.date.slice(5)} · ` : ''}
            {task.title}
          </Animated.Text>
        ))
      )}
      {open.length > 6 ? (
        <Text style={styles.more}>{t.tf('weekly.more', { n: open.length - 6 })}</Text>
      ) : null}

      <Text style={styles.section}>{t.tf('weekly.bills', { n: dueBills.length })}</Text>
      {dueBills.length === 0 ? (
        <Text style={styles.empty}>{t('weekly.billsEmpty')}</Text>
      ) : (
        dueBills.map((b) => (
          <Text key={b.id} style={styles.line} numberOfLines={1}>
            {b.title} · {formatMoney(b.amount, b.currency)} · {t.tf('weekly.billDay', { n: b.dayOfMonth })}
          </Text>
        ))
      )}

      <View style={styles.actions}>
        {onPlanDay ? (
          <SoftPressable style={styles.primary} onPress={onPlanDay}>
            <Text style={styles.primaryText}>{t('weekly.planToday')}</Text>
          </SoftPressable>
        ) : null}
        <View style={styles.row}>
          {onOpenTasks ? (
            <Pressable style={styles.secondary} onPress={onOpenTasks}>
              <Text style={styles.secondaryText}>{t('tabs.tasks')}</Text>
            </Pressable>
          ) : null}
          {onOpenBills ? (
            <Pressable style={styles.secondary} onPress={onOpenBills}>
              <Text style={styles.secondaryText}>{t('tabs.bills')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={onClose} style={styles.dismiss}>
          <Text style={styles.dismissText}>{t('common.gotIt')}</Text>
        </Pressable>
      </View>
    </Animated.View>
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
    backgroundColor: colors.accent,
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
