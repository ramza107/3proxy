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

/** Monday overview: focuses, unfinished week, bills — calm Pro ritual. */
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
      <View style={styles.hero}>
        <Text style={styles.kicker}>{t('weekly.kicker')}</Text>
        <Text style={styles.range}>{rangeLabel}</Text>
        <Text style={styles.heroSub}>{t('weekly.sub')}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{focuses.length}</Text>
            <Text style={styles.statLabel}>{t('weekly.focus')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{open.length}</Text>
            <Text style={styles.statLabel}>{t('weekly.openShort')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dueBills.length}</Text>
            <Text style={styles.statLabel}>{t('weekly.billsShort')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>{t('weekly.focus')}</Text>
        {focuses.length === 0 ? (
          <Text style={styles.empty}>{t('weekly.focusEmpty')}</Text>
        ) : (
          focuses.map((title, i) => (
            <Animated.View
              key={`${title}-${i}`}
              entering={FadeInDown.delay(60 + i * 45).duration(300)}
              style={styles.focusRow}
            >
              <View style={styles.focusNumWrap}>
                <Text style={styles.focusNum}>{i + 1}</Text>
              </View>
              <Text style={styles.focusTitle} numberOfLines={2}>
                {title}
              </Text>
            </Animated.View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>{t.tf('weekly.stillOpen', { n: open.length })}</Text>
        {open.length === 0 ? (
          <Text style={styles.empty}>{t('weekly.clear')}</Text>
        ) : (
          open.slice(0, 6).map((task, i) => (
            <Animated.View
              key={task.id}
              entering={FadeInDown.delay(80 + i * 30).duration(260)}
              style={styles.lineRow}
            >
              <View style={styles.lineDot} />
              <Text style={styles.line} numberOfLines={1}>
                {task.date ? `${task.date.slice(5)} · ` : ''}
                {task.title}
              </Text>
            </Animated.View>
          ))
        )}
        {open.length > 6 ? (
          <Text style={styles.more}>{t.tf('weekly.more', { n: open.length - 6 })}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>{t.tf('weekly.bills', { n: dueBills.length })}</Text>
        {dueBills.length === 0 ? (
          <Text style={styles.empty}>{t('weekly.billsEmpty')}</Text>
        ) : (
          dueBills.map((b) => (
            <View key={b.id} style={styles.lineRow}>
              <View style={styles.lineDot} />
              <Text style={styles.line} numberOfLines={1}>
                {b.title} · {formatMoney(b.amount, b.currency)} ·{' '}
                {t.tf('weekly.billDay', { n: b.dayOfMonth })}
              </Text>
            </View>
          ))
        )}
      </View>

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
  wrap: { gap: 10 },
  hero: {
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  range: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  heroSub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.textDim, fontFamily: fonts.body, fontSize: 11 },
  card: {
    backgroundColor: 'rgba(250,252,251,0.96)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 2,
  },
  section: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  focusNumWrap: {
    width: 24,
    height: 24,
    borderRadius: 99,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusNum: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  focusTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.accentStrong,
    opacity: 0.45,
  },
  line: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  more: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
  empty: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, paddingVertical: 4 },
  actions: { marginTop: spacing.sm, gap: 8 },
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
    backgroundColor: 'rgba(250,252,251,0.9)',
  },
  secondaryText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 14 },
  dismiss: { alignItems: 'center', paddingVertical: 12 },
  dismissText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 14 },
})
