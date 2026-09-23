import { format } from 'date-fns'
import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { colors, fonts, radii } from '../constants/theme'
import {
  currentMonthKey,
  dueTotalsByCurrency,
  effectiveDueDate,
  formatBillDueLabel,
  formatMoney,
  isPayUrl,
  upcomingUnpaidBills,
} from '../lib/bills'
import { dateLocale } from '../lib/dateLocale'
import { useNovaStore } from '../lib/store'
import { useT } from '../lib/useT'
import { refreshWidgetSnapshot } from '../lib/widgetSync'
import type { Bill } from '../types'
import { HomeSection } from './HomeSection'

/** Home strip: pay-today list + month totals. */
export function BillsBrief() {
  const t = useT()
  const router = useRouter()
  const bills = useNovaStore((s) => s.bills)
  const markBillPaid = useNovaStore((s) => s.markBillPaid)
  const locale = dateLocale(t.language)

  const { byCur, count } = useMemo(() => dueTotalsByCurrency(bills), [bills])
  const upcoming = useMemo(() => upcomingUnpaidBills(bills, 14).slice(0, 4), [bills])
  const currencies = Object.keys(byCur)

  const onMarkPaid = (bill: Bill) => {
    markBillPaid(bill.id)
    void refreshWidgetSnapshot()
  }

  const onPay = (bill: Bill) => {
    const pay = bill.payHowTo?.trim()
    if (pay && isPayUrl(pay)) {
      Linking.openURL(pay).catch(() => undefined)
      return
    }
    router.push('/bills')
  }

  if (!bills.length) {
    return (
      <HomeSection title={t('home.billsDue')} meta={t('home.billsNone')}>
        <Text style={styles.summary}>{t('home.billsEmpty')}</Text>
        <Pressable style={styles.btn} onPress={() => router.push('/bills')}>
          <Text style={styles.btnText}>{t('home.openBills')}</Text>
        </Pressable>
      </HomeSection>
    )
  }

  if (count === 0) {
    return (
      <HomeSection title={t('home.billsDue')} meta={t('home.billsClear')}>
        <Text style={styles.quiet}>{t('home.billsAllPaid')}</Text>
        <Pressable onPress={() => router.push('/bills')} hitSlop={8}>
          <Text style={styles.link}>{t('home.openBills')}</Text>
        </Pressable>
      </HomeSection>
    )
  }

  const monthLabel = currentMonthKey()

  return (
    <HomeSection
      title={t('home.billsDue')}
      meta={t.tf('home.billsLeftCount', { n: count })}
      action={
        <Pressable onPress={() => router.push('/bills')} hitSlop={8}>
          <Text style={styles.link}>{t('home.open')}</Text>
        </Pressable>
      }
    >
      <View style={styles.row}>
        {currencies.map((cur) => (
          <View key={cur} style={styles.chip}>
            <Text style={styles.amount}>{formatMoney(byCur[cur] || 0, cur)}</Text>
            <Text style={styles.cur}>
              {cur} · {monthLabel}
            </Text>
          </View>
        ))}
      </View>

      {upcoming.map((bill) => {
        const due = format(effectiveDueDate(bill), 'MMM d', { locale })
        const when = formatBillDueLabel(bill)
        const whenLabel =
          when === 'today'
            ? t('common.today')
            : when === 'tomorrow'
              ? t('common.tomorrow')
              : when === 'overdue'
                ? t('home.billsOverdue')
                : due
        const pay = bill.payHowTo?.trim()
        return (
          <View key={bill.id} style={styles.billRow}>
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text style={styles.billTitle} numberOfLines={1}>
                {bill.title}
              </Text>
              <Text style={styles.billMeta} numberOfLines={1}>
                {formatMoney(bill.amount, bill.currency)} · {whenLabel}
              </Text>
            </View>
            {pay ? (
              <Pressable style={styles.payLinkBtn} onPress={() => onPay(bill)} hitSlop={6}>
                <Text style={styles.payLinkText}>
                  {isPayUrl(pay) ? t('home.billsPayLink') : t('home.billsHowToPay')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.paidBtn} onPress={() => onMarkPaid(bill)} hitSlop={6}>
              <Text style={styles.paidBtnText}>{t('home.billsMarkPaid')}</Text>
            </Pressable>
          </View>
        )
      })}

      {upcoming.length === 0 ? (
        <Text style={styles.hint}>{t('home.billsHint')}</Text>
      ) : count > upcoming.length ? (
        <Pressable onPress={() => router.push('/bills')} hitSlop={8}>
          <Text style={styles.more}>{t.tf('home.billsMore', { n: count - upcoming.length })}</Text>
        </Pressable>
      ) : null}
    </HomeSection>
  )
}

const styles = StyleSheet.create({
  summary: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  quiet: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  more: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 6 },
  link: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
  },
  amount: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  cur: { color: colors.textDim, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  billTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  billMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12 },
  payLinkBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  payLinkText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 12 },
  paidBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  paidBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 12 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
})
