import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { guessKind, normalizeInvestSymbol } from '../lib/invest'
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
  }, [holding, visible])

  const onSymbolBlur = () => {
    const next = normalizeInvestSymbol(symbol)
    setSymbol(next)
    if (!holding?.kind || creating) setKind(guessKind(next))
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
