import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { InvestmentEditor } from '../../components/InvestmentEditor'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { dateLocale } from '../../lib/dateLocale'
import { holdingPnL, normalizeInvestSymbol, portfolioSummary } from '../../lib/invest'
import { fetchInvestQuotes, formatMoney, formatPct } from '../../lib/investApi'
import { useIsPro } from '../../lib/pro'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import type { InvestQuote, InvestmentHolding } from '../../types'

export default function InvestScreen() {
  const t = useT()
  const router = useRouter()
  const isPro = useIsPro()
  const investments = useNovaStore((s) => s.investments)
  const createInvestmentLocal = useNovaStore((s) => s.createInvestmentLocal)
  const upsertInvestment = useNovaStore((s) => s.upsertInvestment)
  const removeInvestment = useNovaStore((s) => s.removeInvestment)
  const patchInvestmentQuotes = useNovaStore((s) => s.patchInvestmentQuotes)
  const updateSettings = useNovaStore((s) => s.updateSettings)

  const [quotes, setQuotes] = useState<InvestQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [demoQuotes, setDemoQuotes] = useState(false)
  const [editing, setEditing] = useState<InvestmentHolding | null>(null)
  const [creating, setCreating] = useState(false)

  const quoteMap = useMemo(() => {
    const m = new Map<string, InvestQuote>()
    for (const q of quotes) {
      const sym = q.symbol.toUpperCase()
      m.set(sym, q)
      m.set(sym.replace('-USD', ''), q)
      // Alias keys so GOLD holdings match GC=F quotes and vice versa
      if (sym === 'GC=F') {
        m.set('GOLD', q)
        m.set('XAU', q)
      }
      if (sym === 'SI=F') {
        m.set('SILVER', q)
        m.set('XAG', q)
      }
    }
    return m
  }, [quotes])

  const rows = useMemo(() => {
    return investments
      .map((h) => {
        const key = h.symbol.toUpperCase()
        const q =
          quoteMap.get(key) ||
          quoteMap.get(key.replace('-USD', '')) ||
          null
        return holdingPnL(h, q)
      })
      .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
  }, [investments, quoteMap])

  const summary = useMemo(() => portfolioSummary(rows), [rows])

  const symbolsKey = useMemo(
    () =>
      [
        ...new Set(
          investments.map((h) => normalizeInvestSymbol(h.symbol)).filter(Boolean),
        ),
      ]
        .sort()
        .join(','),
    [investments],
  )

  const refreshQuotes = useCallback(async () => {
    if (!isPro || !symbolsKey) {
      setQuotes([])
      return
    }
    setLoading(true)
    try {
      const symbols = symbolsKey.split(',').filter(Boolean)
      const { quotes: next, demo } = await fetchInvestQuotes(symbols)
      setQuotes(next)
      setDemoQuotes(demo)
      patchInvestmentQuotes(
        next.map((q) => ({
          symbol: q.symbol,
          price: q.price,
          name: q.name,
          changePct: q.changePct,
        })),
      )
    } finally {
      setLoading(false)
    }
  }, [isPro, symbolsKey, patchInvestmentQuotes])

  useEffect(() => {
    if (!isPro) return
    refreshQuotes().catch(() => undefined)
  }, [isPro, symbolsKey, refreshQuotes])

  const pulse = useSharedValue(1)
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false,
    )
  }, [pulse])
  const heroPulse = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))

  if (!isPro) {
    return (
      <Screen>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.kicker}>{t('invest.kicker')}</Text>
            <Text style={styles.title}>{t('invest.title')}</Text>
            <Text style={styles.sub}>{t('invest.sub')}</Text>
          </View>
          <View style={styles.lockCard}>
            <Animated.View style={[styles.lockOrb, heroPulse]} />
            <Text style={styles.lockTitle}>{t('invest.proTitle')}</Text>
            <Text style={styles.lockText}>{t('invest.proText')}</Text>
            <SoftPressable
              style={styles.lockBtn}
              onPress={() => {
                updateSettings({ isPro: true })
              }}
            >
              <Text style={styles.lockBtnText}>{t('invest.enablePro')}</Text>
            </SoftPressable>
            <Pressable onPress={() => router.push('/settings')}>
              <Text style={styles.lockLink}>{t('invest.openSettings')}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Screen>
    )
  }

  const pnlPositive = (summary.pnlAbs ?? 0) >= 0

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{t('invest.kicker')}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('invest.title')}</Text>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.sub}>{t('invest.sub')}</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(420)} style={styles.hero}>
          <Text style={styles.heroLabel}>{t('invest.portfolio')}</Text>
          <Text style={styles.heroValue}>
            {formatMoney(summary.value || summary.cost, 'USD')}
          </Text>
          <View style={styles.heroMeta}>
            <Text style={[styles.heroPnl, pnlPositive ? styles.gain : styles.loss]}>
              {summary.pnlAbs == null
                ? t('invest.waitingPrice')
                : `${summary.pnlAbs >= 0 ? '+' : ''}${formatMoney(summary.pnlAbs, 'USD')} · ${formatPct(summary.pnlPct || 0)}`}
            </Text>
            <Text style={styles.heroCost}>
              {t.tf('invest.costBasis', { amount: formatMoney(summary.cost, 'USD') })}
            </Text>
          </View>
          {demoQuotes ? <Text style={styles.demoNote}>{t('invest.demoNote')}</Text> : null}
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshQuotes} tintColor={colors.accent} />
          }
        >
          {investments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('invest.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('invest.emptyText')}</Text>
              <Pressable
                style={styles.sampleBtn}
                onPress={() => {
                  createInvestmentLocal({
                    symbol: 'AAPL',
                    name: 'Apple Inc.',
                    kind: 'stock',
                    quantity: 10,
                    costBasisPerUnit: 180,
                    boughtOn: '2024-06-15',
                  })
                  createInvestmentLocal({
                    symbol: 'BTC-USD',
                    name: 'Bitcoin',
                    kind: 'crypto',
                    quantity: 0.05,
                    costBasisPerUnit: 42000,
                    boughtOn: '2024-01-20',
                  })
                  createInvestmentLocal({
                    symbol: 'VOO',
                    name: 'Vanguard S&P 500 ETF',
                    kind: 'etf',
                    quantity: 5,
                    costBasisPerUnit: 420,
                    boughtOn: '2023-11-01',
                  })
                }}
              >
                <Text style={styles.sampleBtnText}>{t('invest.addSample')}</Text>
              </Pressable>
            </View>
          ) : (
            rows.map((row, i) => (
              <Animated.View key={row.holding.id} entering={FadeInDown.delay(i * 50).duration(320)}>
                <HoldingRow
                  row={row}
                  onPress={() => {
                    setCreating(false)
                    setEditing(row.holding)
                  }}
                />
              </Animated.View>
            ))
          )}
          {loading && investments.length > 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>{t('invest.refreshing')}</Text>
            </View>
          ) : null}
        </ScrollView>

        <SoftPressable
          style={styles.fab}
          onPress={() => {
            setCreating(true)
            setEditing(null)
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </SoftPressable>

        <InvestmentEditor
          visible={creating || !!editing}
          creating={creating}
          holding={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={(patch) => {
            if (creating) {
              createInvestmentLocal(patch)
              return
            }
            if (editing) {
              upsertInvestment({
                ...editing,
                ...patch,
                updated_at: new Date().toISOString(),
              })
            }
          }}
          onDelete={
            editing && !creating
              ? () => {
                  removeInvestment(editing.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Screen>
  )
}

function HoldingRow({
  row,
  onPress,
}: {
  row: ReturnType<typeof holdingPnL>
  onPress: () => void
}) {
  const t = useT()
  const h = row.holding
  const gain = (row.pnlAbs ?? 0) >= 0
  const bought = h.boughtOn
    ? format(new Date(`${h.boughtOn}T12:00:00`), 'd MMM yyyy', {
        locale: dateLocale(t.language),
      })
    : ''

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.node, row.pnlAbs != null && (gain ? styles.nodeGain : styles.nodeLoss)]} />
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.sym}>{h.symbol}</Text>
          <Text style={styles.price}>
            {row.price != null ? formatMoney(row.price, h.currency) : '—'}
          </Text>
        </View>
        <Text style={styles.rowMeta}>
          {t(`invest.kind.${h.kind}`)}
          {h.name ? ` · ${h.name}` : ''}
          {` · ${h.quantity} × ${formatMoney(h.costBasisPerUnit, h.currency)}`}
        </Text>
        <Text style={styles.rowMeta}>
          {t.tf('invest.bought', { date: bought })}
          {row.marketValue != null
            ? ` · ${t.tf('invest.value', { amount: formatMoney(row.marketValue, h.currency) })}`
            : ''}
        </Text>
        <Text style={[styles.pnl, gain ? styles.gain : styles.loss]}>
          {row.pnlAbs == null
            ? t('invest.waitingPrice')
            : `${row.pnlAbs >= 0 ? '+' : ''}${formatMoney(row.pnlAbs, h.currency)} (${formatPct(row.pnlPct || 0)})`}
          {row.dayChangePct != null ? ` · ${t.tf('invest.day', { pct: formatPct(row.dayChangePct) })}` : ''}
        </Text>
      </View>
    </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  proPill: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proPillText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  sub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  hero: {
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    padding: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.bgDeep,
    overflow: 'hidden',
  },
  heroLabel: {
    color: 'rgba(247,251,250,0.65)',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: colors.textOnAccent,
    fontFamily: fonts.brand,
    fontSize: 36,
    letterSpacing: -1,
    marginTop: 4,
  },
  heroMeta: { marginTop: 8, gap: 2 },
  heroPnl: { fontFamily: fonts.bodyBold, fontSize: 16 },
  heroCost: {
    color: 'rgba(247,251,250,0.55)',
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  demoNote: {
    color: 'rgba(247,251,250,0.45)',
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 8,
  },
  gain: { color: '#6EE7B7' },
  loss: { color: '#FCA5A5' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 140, gap: 2 },
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  nodeGain: { backgroundColor: colors.success },
  nodeLoss: { backgroundColor: colors.danger },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sym: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 17 },
  price: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  rowMeta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  pnl: { fontFamily: fonts.bodyBold, fontSize: 13, marginTop: 4 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
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
  lockCard: {
    marginHorizontal: spacing.lg,
    marginTop: 24,
    padding: 24,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'flex-start',
    gap: 10,
    overflow: 'hidden',
  },
  lockOrb: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accentSoft,
  },
  lockTitle: { color: colors.text, fontFamily: fonts.brand, fontSize: 26, marginTop: 8 },
  lockText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  lockBtn: {
    marginTop: 8,
    backgroundColor: colors.bgDeep,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 15 },
  lockLink: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    marginTop: 4,
  },
})
