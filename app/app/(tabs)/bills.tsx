import { format } from 'date-fns'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { BillEditor } from '../../components/BillEditor'
import { FAB_RIGHT, FAB_SCROLL_INSET, FAB_SIZE, localFabBottom } from '../../components/ChatFab'
import { MistPanel } from '../../components/MistPanel'
import { MistScreenHero } from '../../components/MistScreenHero'
import { ProSpaceLock } from '../../components/ProSpaceLock'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { useIsPro } from '../../lib/pro'
import {
  currentMonthKey,
  formatMoney,
  isPaidThisMonth,
  nextDueDate,
  sampleBills,
  sortBills,
} from '../../lib/bills'
import { dateLocale } from '../../lib/dateLocale'
import { uid, useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import type { Bill } from '../../types'

export default function BillsScreen() {
  const t = useT()
  const insets = useSafeAreaInsets()
  const isPro = useIsPro()
  const { billId } = useLocalSearchParams<{ billId?: string }>()
  const bills = useNovaStore((s) => s.bills)
  const upsertBill = useNovaStore((s) => s.upsertBill)
  const removeBill = useNovaStore((s) => s.removeBill)
  const markBillPaid = useNovaStore((s) => s.markBillPaid)
  const setBills = useNovaStore((s) => s.setBills)
  const createBillLocal = useNovaStore((s) => s.createBillLocal)

  const [editing, setEditing] = useState<Bill | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!billId || typeof billId !== 'string') return
    const found = bills.find((b) => b.id === billId)
    if (found) setEditing(found)
  }, [billId, bills])

  const month = currentMonthKey()
  const monthLabel = format(new Date(), 'MMMM yyyy', { locale: dateLocale(t.language) })

  const sorted = useMemo(() => sortBills(bills.filter((b) => b.active !== false)), [bills])
  const due = sorted.filter((b) => !isPaidThisMonth(b, month))
  const paid = sorted.filter((b) => isPaidThisMonth(b, month))
  const paused = useMemo(() => bills.filter((b) => b.active === false), [bills])

  const totals = useMemo(() => {
    const byCur: Record<string, { due: number; paid: number; all: number }> = {}
    for (const b of bills.filter((x) => x.active !== false)) {
      const cur = (b.currency || 'UAH').toUpperCase()
      if (!byCur[cur]) byCur[cur] = { due: 0, paid: 0, all: 0 }
      byCur[cur].all += b.amount
      if (isPaidThisMonth(b, month)) byCur[cur].paid += b.amount
      else byCur[cur].due += b.amount
    }
    return byCur
  }, [bills, month])

  const fillSamples = () => {
    const now = new Date().toISOString()
    const samples: Bill[] = sampleBills().map((s) => ({
      ...s,
      id: uid('bill'),
      created_at: now,
      updated_at: now,
    }))
    setBills([...samples, ...bills])
  }

  const openCreate = () => {
    setCreating(true)
    setEditing(null)
  }

  if (!isPro) {
    return (
      <ProSpaceLock
        kicker={t('bills.kicker')}
        title={t('bills.title')}
        sub={t('bills.due')}
        lockTitle={t('pro.spaceLockTitle')}
        lockText={t('pro.spaceLockBills')}
      />
    )
  }

  const dueChip =
    due.length > 0
      ? t.tf('bills.dueChip', { n: due.length })
      : bills.length > 0
        ? t('bills.allCaughtUp')
        : undefined

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <MistScreenHero
          title={t('bills.title')}
          sub={monthLabel}
          chip={dueChip}
          chipQuiet={due.length === 0}
        >
          {Object.keys(totals).length > 0 ? (
            <Text style={styles.statsLine}>
              {Object.entries(totals).map(([cur, tot], i) => (
                <Text key={cur}>
                  {i > 0 ? ' · ' : ''}
                  <Text style={styles.statsStrong}>{formatMoney(tot.due, cur)}</Text>
                  {` ${t('bills.due').toLowerCase()}`}
                  {' · '}
                  <Text style={styles.statsStrong}>{formatMoney(tot.paid, cur)}</Text>
                  {` ${t('bills.paid').toLowerCase()}`}
                </Text>
              ))}
            </Text>
          ) : null}
        </MistScreenHero>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {bills.length === 0 ? (
            <MistPanel emphasize>
              <Text style={styles.emptyTitle}>{t('bills.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('bills.emptyText')}</Text>
              <View style={styles.emptyActions}>
                <Pressable style={styles.sampleBtn} onPress={openCreate}>
                  <Text style={styles.sampleBtnText}>{t('bills.add')}</Text>
                </Pressable>
                <Pressable style={styles.sampleBtnGhost} onPress={fillSamples}>
                  <Text style={styles.sampleBtnGhostText}>{t('bills.addSample')}</Text>
                </Pressable>
              </View>
            </MistPanel>
          ) : null}

          {due.length > 0 ? (
            <Section title={t('bills.due')} count={due.length}>
              {due.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  paid={false}
                  markPaidLabel={t('bills.markPaid')}
                  undoLabel={t('bills.undo')}
                  onPress={() => {
                    setCreating(false)
                    setEditing(bill)
                  }}
                  onPaid={() => markBillPaid(bill.id, month)}
                />
              ))}
            </Section>
          ) : null}

          {paid.length > 0 ? (
            <Section title={t('bills.paid')} count={paid.length}>
              {paid.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  paid
                  markPaidLabel={t('bills.markPaid')}
                  undoLabel={t('bills.undo')}
                  onPress={() => {
                    setCreating(false)
                    setEditing(bill)
                  }}
                  onPaid={() =>
                    upsertBill({
                      ...bill,
                      lastPaidMonth: null,
                      paidHistory: (bill.paidHistory || []).filter((m) => m !== month),
                      updated_at: new Date().toISOString(),
                    })
                  }
                />
              ))}
            </Section>
          ) : null}

          {paused.length > 0 ? (
            <Section title={t('bills.paused')} count={paused.length}>
              {paused.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  paid={isPaidThisMonth(bill, month)}
                  markPaidLabel={t('bills.markPaid')}
                  undoLabel={t('bills.undo')}
                  onPress={() => {
                    setCreating(false)
                    setEditing(bill)
                  }}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>

        <SoftPressable style={[styles.fab, { bottom: localFabBottom(insets.bottom), right: FAB_RIGHT, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 }]} onPress={openCreate}>
          <Text style={styles.fabText}>+</Text>
        </SoftPressable>

        <BillEditor
          visible={creating || !!editing}
          creating={creating}
          bill={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={(patch) => {
            if (creating) {
              createBillLocal(patch)
              return
            }
            if (editing) {
              upsertBill({
                ...editing,
                ...patch,
                updated_at: new Date().toISOString(),
              })
            }
          }}
          onDelete={
            editing && !creating
              ? () => {
                  removeBill(editing.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Screen>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <MistPanel title={title} meta={String(count)}>
      {children}
    </MistPanel>
  )
}

function BillRow({
  bill,
  paid,
  onPress,
  onPaid,
  markPaidLabel,
  undoLabel,
}: {
  bill: Bill
  paid: boolean
  onPress: () => void
  onPaid?: () => void
  markPaidLabel: string
  undoLabel: string
}) {
  const t = useT()
  const due = nextDueDate(bill)
  const pay = bill.payHowTo?.trim()
  const isUrl = pay ? /^https?:\/\//i.test(pay) : false
  const histCount = bill.paidHistory?.length || 0
  const dueLabel = format(due, 'MMM d', { locale: dateLocale(t.language) })

  return (
    <View style={[styles.row, paid && styles.rowPaid]}>
      <Pressable style={styles.rowMain} onPress={onPress}>
        <View style={[styles.node, paid && styles.nodePaid]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{bill.title}</Text>
          <Text style={styles.rowMeta}>
            {bill.category} · {t.tf('bills.dayNext', { day: bill.dayOfMonth, next: dueLabel })}
            {histCount ? ` · ${t.tf('bills.paidCount', { n: histCount })}` : ''}
          </Text>
          {pay ? (
            <Pressable
              onPress={() => {
                if (isUrl) Linking.openURL(pay).catch(() => undefined)
                else onPress()
              }}
              hitSlop={4}
            >
              <Text style={styles.payHow} numberOfLines={1}>
                {isUrl ? 'Pay link ›' : `Pay · ${pay}`}
              </Text>
            </Pressable>
          ) : null}
          {bill.notes ? (
            <Text style={styles.rowNotes} numberOfLines={1}>
              {bill.notes}
            </Text>
          ) : null}
        </View>
        <Text style={styles.rowAmount}>{formatMoney(bill.amount, bill.currency)}</Text>
      </Pressable>
      {onPaid ? (
        <Pressable style={styles.payBtn} onPress={onPaid}>
          <Text style={styles.payBtnText}>{paid ? undoLabel : markPaidLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  statsLine: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  statsStrong: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontVariant: ['tabular-nums'],
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: FAB_SCROLL_INSET, gap: 10 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,110,102,0.12)',
    paddingBottom: 10,
    marginBottom: 4,
    gap: 6,
  },
  rowPaid: { opacity: 0.55 },
  rowMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  node: {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  nodePaid: { backgroundColor: colors.signalMuted },
  rowTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16 },
  rowMeta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  payHow: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 3,
  },
  rowNotes: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  rowAmount: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    marginTop: 2,
  },
  payBtn: { alignSelf: 'flex-start', marginLeft: 22, paddingVertical: 4, paddingHorizontal: 4 },
  payBtnText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  emptyTitle: {
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sampleBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBtnText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  sampleBtnGhost: {
    borderRadius: radii.full,
    paddingHorizontal: 12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBtnGhostText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 96,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 40,
  },
  fabText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    marginTop: -2,
  },
})
