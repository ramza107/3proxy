import { format } from 'date-fns'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BillEditor } from '../../components/BillEditor'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import {
  currentMonthKey,
  formatMoney,
  isPaidThisMonth,
  nextDueDate,
  sampleBills,
  sortBills,
} from '../../lib/bills'
import { uid, useNovaStore } from '../../lib/store'
import type { Bill } from '../../types'

export default function BillsScreen() {
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
  const monthLabel = format(new Date(), 'MMMM yyyy')

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

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Monthly</Text>
          <Text style={styles.title}>Bills</Text>
          <Text style={styles.sub}>
            Recurring payments for {monthLabel} — mark paid when you send them
          </Text>
        </View>

        <View style={styles.statsRow}>
          {Object.keys(totals).length === 0 ? (
            <View style={styles.statWide}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>No payments yet</Text>
            </View>
          ) : (
            Object.entries(totals).map(([cur, t]) => (
              <View key={cur} style={styles.stat}>
                <Text style={styles.statValue} numberOfLines={1}>
                  {formatMoney(t.due, cur)}
                </Text>
                <Text style={styles.statLabel}>Due · {cur}</Text>
                <Text style={styles.statSub}>
                  Paid {formatMoney(t.paid, cur)} / {formatMoney(t.all, cur)}
                </Text>
              </View>
            ))
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {bills.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Track rent, subs, utilities</Text>
              <Text style={styles.emptyText}>
                Add each monthly payment once — Wahrly shows what’s due this month and what you’ve
                already paid.
              </Text>
              <Pressable style={styles.sampleBtn} onPress={fillSamples}>
                <Text style={styles.sampleBtnText}>Add sample bills</Text>
              </Pressable>
            </View>
          ) : null}

          {due.length > 0 ? (
            <Section title="Due this month" count={due.length}>
              {due.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  paid={false}
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
            <Section title="Paid this month" count={paid.length}>
              {paid.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  paid
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
            <Section title="Paused" count={paused.length}>
              {paused.map((bill) => (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  paid={isPaidThisMonth(bill, month)}
                  onPress={() => {
                    setCreating(false)
                    setEditing(bill)
                  }}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>

        <SoftPressable style={styles.fab} onPress={openCreate}>
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
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {children}
    </View>
  )
}

function BillRow({
  bill,
  paid,
  onPress,
  onPaid,
}: {
  bill: Bill
  paid: boolean
  onPress: () => void
  onPaid?: () => void
}) {
  const due = nextDueDate(bill)
  const pay = bill.payHowTo?.trim()
  const isUrl = pay ? /^https?:\/\//i.test(pay) : false
  const histCount = bill.paidHistory?.length || 0

  return (
    <View style={[styles.row, paid && styles.rowPaid]}>
      <Pressable style={styles.rowMain} onPress={onPress}>
        <View style={[styles.node, paid && styles.nodePaid]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{bill.title}</Text>
          <Text style={styles.rowMeta}>
            {bill.category} · day {bill.dayOfMonth} · next {format(due, 'MMM d')}
            {histCount ? ` · ${histCount} paid` : ''}
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
          <Text style={styles.payBtnText}>{paid ? 'Undo' : 'Mark paid'}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 4,
    marginBottom: 10,
  },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  sub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 8,
  },
  stat: {
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    gap: 2,
  },
  statWide: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  statLabel: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  statSub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 140, gap: 8 },
  section: { marginTop: 10, gap: 4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  sectionTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  sectionCount: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 13 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
  empty: { paddingVertical: spacing.lg, gap: 8 },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  sampleBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBtnText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 18,
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
