import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { guessKind, normalizeInvestSymbol } from '../lib/invest'
import { fetchInvestQuotes, formatMoney, searchInvestSymbols } from '../lib/investApi'
import { resolveInvestAlias, type InvestSearchHit } from '../lib/investCatalog'
import { localISODate } from '../lib/localDate'
import { useT } from '../lib/useT'
import { INVEST_ASSET_KINDS, type InvestAssetKind, type InvestmentHolding } from '../types'
import { BottomSheet } from './BottomSheet'

type Props = {
  holding: InvestmentHolding | null
  visible: boolean
  creating?: boolean
  onClose: () => void
  onSave: (patch: {
    symbol: string
    name: string | null
    kind: InvestAssetKind
    quantity: number
    costBasisPerUnit: number
    currency: string
    boughtOn: string
    notes: string | null
  }) => void
  onDelete?: () => void
}

export function InvestmentEditor({
  holding,
  visible,
  creating,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const t = useT()
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<InvestAssetKind>('stock')
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [boughtOn, setBoughtOn] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<InvestSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [liveCurrency, setLiveCurrency] = useState('USD')
  const [priceLoading, setPriceLoading] = useState(false)
  const searchSeq = useRef(0)
  const priceSeq = useRef(0)

  useEffect(() => {
    if (!visible) return
    setSymbol(holding?.symbol || '')
    setName(holding?.name || '')
    setKind(holding?.kind || 'stock')
    setQuantity(holding ? String(holding.quantity) : '')
    setCost(holding ? String(holding.costBasisPerUnit) : '')
    setBoughtOn(holding?.boughtOn || localISODate())
    setNotes(holding?.notes || '')
    setError('')
    setSuggestions([])
    setLivePrice(holding?.lastPrice ?? null)
    setLiveCurrency(holding?.currency || 'USD')
    setSearching(false)
    setPriceLoading(false)
  }, [holding, visible])

  useEffect(() => {
    if (!visible) return
    const q = symbol.trim()
    if (q.length < 1) {
      setSuggestions([])
      setSearching(false)
      return
    }
    // Don't keep suggesting after an exact ticker pick with no query change noise
    const seq = ++searchSeq.current
    setSearching(true)
    const timer = setTimeout(() => {
      searchInvestSymbols(q)
        .then((hits) => {
          if (seq !== searchSeq.current) return
          setSuggestions(hits)
        })
        .catch(() => {
          if (seq !== searchSeq.current) return
          setSuggestions([])
        })
        .finally(() => {
          if (seq === searchSeq.current) setSearching(false)
        })
    }, 280)
    return () => clearTimeout(timer)
  }, [symbol, visible])

  const loadLivePrice = async (sym: string) => {
    const ticker = normalizeInvestSymbol(sym)
    if (!ticker) {
      setLivePrice(null)
      return
    }
    const seq = ++priceSeq.current
    setPriceLoading(true)
    try {
      const { quotes } = await fetchInvestQuotes([ticker])
      if (seq !== priceSeq.current) return
      const quote =
        quotes.find((q) => q.symbol.toUpperCase() === ticker.toUpperCase()) || quotes[0]
      if (quote) {
        setLivePrice(quote.price)
        setLiveCurrency(quote.currency || 'USD')
        if (quote.name && !name.trim()) setName(quote.name)
        if (quote.kind) setKind(quote.kind)
      } else {
        setLivePrice(null)
      }
    } catch {
      if (seq === priceSeq.current) setLivePrice(null)
    } finally {
      if (seq === priceSeq.current) setPriceLoading(false)
    }
  }

  const applyHit = (hit: InvestSearchHit) => {
    setSymbol(hit.symbol)
    setName(hit.name)
    setKind(hit.kind)
    setSuggestions([])
    setSearching(false)
    void loadLivePrice(hit.symbol)
  }

  const onSymbolBlur = () => {
    const alias = resolveInvestAlias(symbol)
    const next = alias.symbol || normalizeInvestSymbol(symbol)
    setSymbol(next)
    if (alias.name && !name.trim()) setName(alias.name)
    if (!holding?.kind || creating) setKind(alias.kind || guessKind(next))
    if (next) void loadLivePrice(next)
  }

  const useLiveAsBuy = () => {
    if (livePrice == null) return
    setCost(String(Number(livePrice.toFixed(livePrice >= 100 ? 2 : 4))))
  }

  const save = () => {
    const sym = normalizeInvestSymbol(symbol)
    if (!sym) {
      setError(t('invest.symbolRequired'))
      return
    }
    const qty = Number(String(quantity).replace(',', '.'))
    const basis = Number(String(cost).replace(',', '.'))
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(t('invest.qtyInvalid'))
      return
    }
    if (!Number.isFinite(basis) || basis < 0) {
      setError(t('invest.costInvalid'))
      return
    }
    const date = boughtOn.trim()
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError(t('life.dateFmt'))
      return
    }
    onSave({
      symbol: sym,
      name: name.trim() || null,
      kind,
      quantity: qty,
      costBasisPerUnit: basis,
      currency: 'USD',
      boughtOn: date || localISODate(),
      notes: notes.trim() || null,
    })
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={creating ? t('invest.newHolding') : t('invest.editHolding')}
      subtitle={t('invest.editorHint')}
      footer={
        <View style={styles.footer}>
          <Pressable style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveText}>{t('common.save')}</Text>
          </Pressable>
          {onDelete ? (
            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>{t('common.delete')}</Text>
            </Pressable>
          ) : null}
        </View>
      }
    >
      <Text style={styles.label}>{t('invest.symbol')}</Text>
      <TextInput
        value={symbol}
        onChangeText={setSymbol}
        onBlur={onSymbolBlur}
        style={styles.input}
        placeholder={t('invest.symbolPh')}
        placeholderTextColor={colors.textDim}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {searching ? (
        <View style={styles.searchRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.searchHint}>{t('invest.searching')}</Text>
        </View>
      ) : null}
      {suggestions.length ? (
        <View style={styles.suggestBox}>
          {suggestions.map((hit) => (
            <Pressable
              key={`${hit.symbol}-${hit.name}`}
              style={styles.suggestRow}
              onPress={() => applyHit(hit)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestSym}>{hit.symbol}</Text>
                <Text style={styles.suggestName} numberOfLines={1}>
                  {hit.name}
                </Text>
              </View>
              <Text style={styles.suggestKind}>{t(`invest.kind.${hit.kind}`)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {(priceLoading || livePrice != null) && (
        <View style={styles.liveBox}>
          {priceLoading ? (
            <Text style={styles.liveText}>{t('invest.waitingPrice')}</Text>
          ) : livePrice != null ? (
            <>
              <Text style={styles.liveText}>
                {t.tf('invest.livePrice', { amount: formatMoney(livePrice, liveCurrency) })}
              </Text>
              <Pressable onPress={useLiveAsBuy} hitSlop={8}>
                <Text style={styles.liveAction}>{t('invest.useLivePrice')}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}

      <Text style={styles.label}>{t('invest.nameOpt')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder={t('invest.namePh')}
        placeholderTextColor={colors.textDim}
      />

      <Text style={styles.label}>{t('invest.kind')}</Text>
      <View style={styles.chips}>
        {INVEST_ASSET_KINDS.map((k) => (
          <Pressable
            key={k}
            style={[styles.chip, kind === k && styles.chipOn]}
            onPress={() => setKind(k)}
          >
            <Text style={[styles.chipText, kind === k && styles.chipTextOn]}>
              {t(`invest.kind.${k}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('invest.quantity')}</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            style={styles.input}
            placeholder="10"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('invest.buyPrice')}</Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            style={styles.input}
            placeholder="150.00"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>{t('invest.boughtOn')}</Text>
      <TextInput
        value={boughtOn}
        onChangeText={setBoughtOn}
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
      />

      <Text style={styles.label}>{t('editor.notes')}</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, styles.notes]}
        placeholder={t('invest.notesPh')}
        placeholderTextColor={colors.textDim}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  label: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  notes: { minHeight: 64, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.bgElevated,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextOn: { color: colors.accentStrong },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchHint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  suggestBox: {
    marginTop: 8,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestSym: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  suggestName: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  suggestKind: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 11 },
  liveBox: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  liveText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13, flex: 1 },
  liveAction: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  error: { color: colors.danger, fontFamily: fonts.body, marginTop: 10 },
  footer: { gap: 10, paddingTop: spacing.sm },
  saveBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  deleteBtn: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: colors.danger, fontFamily: fonts.bodyBold, fontSize: 14 },
})
