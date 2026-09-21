import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { colors, fonts, radii } from '../constants/theme'
import { currentMonthKey, dueTotalsByCurrency, formatMoney } from '../lib/bills'
import { useNovaStore } from '../lib/store'
import { useT } from '../lib/useT'
import { HomeSection } from './HomeSection'

/** Home strip: what’s left to pay this month. */
export function BillsBrief() {
  const t = useT()
  const router = useRouter()
  const bills = useNovaStore((s) => s.bills)

  const { byCur, count } = useMemo(() => dueTotalsByCurrency(bills), [bills])
  const currencies = Object.keys(byCur)

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
            <Text style={styles.amount}>{formatMoney(byCur[cur], cur)}</Text>
            <Text style={styles.cur}>{cur} · {monthLabel}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>{t('home.billsHint')}</Text>
    </HomeSection>
  )
}

const styles = StyleSheet.create({
  summary: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  quiet: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  link: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
