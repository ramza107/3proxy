import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { useT } from '../lib/useT'
import { SHOPPING_UNITS, type ShoppingItem, type ShoppingUnit } from '../types'
import { BottomSheet } from './BottomSheet'

type Props = {
  item: ShoppingItem | null
  visible: boolean
  creating?: boolean
  onClose: () => void
  onSave: (patch: {
    title: string
    amount: number | null
    unit: ShoppingUnit | null
  }) => void
  onDelete?: () => void
}

export function ShoppingItemEditor({
  item,
  visible,
  creating,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const t = useT()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<ShoppingUnit | null>('pcs')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setTitle(item?.title || '')
    setAmount(item?.amount != null ? String(item.amount) : '')
    setUnit(item?.unit ?? 'pcs')
    setError('')
  }, [item, visible])

  const save = () => {
    const nextTitle = title.trim()
    if (!nextTitle) {
      setError(t('shopping.titleRequired'))
      return
    }
    const raw = amount.trim().replace(',', '.')
    let nextAmount: number | null = null
    if (raw) {
      const n = Number(raw)
      if (!Number.isFinite(n) || n <= 0) {
        setError(t('shopping.amountInvalid'))
        return
      }
      nextAmount = n
    }
    onSave({
      title: nextTitle,
      amount: nextAmount,
      unit: nextAmount != null ? unit || 'pcs' : null,
    })
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={creating ? t('shopping.newItem') : t('shopping.editItem')}
      subtitle={t('shopping.editorSub')}
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
      <Text style={styles.label}>{t('shopping.item')}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder={t('shopping.titlePh')}
        placeholderTextColor={colors.textDim}
        autoFocus={!!creating}
      />

      <Text style={styles.label}>{t('shopping.amount')}</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        style={styles.input}
        placeholder={t('shopping.amountPh')}
        placeholderTextColor={colors.textDim}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>{t('shopping.unit')}</Text>
      <View style={styles.chips}>
        <Pressable
          style={[styles.chip, unit === null && styles.chipOn]}
          onPress={() => {
            setUnit(null)
            setAmount('')
          }}
        >
          <Text style={[styles.chipText, unit === null && styles.chipTextOn]}>
            {t('shopping.unit.none')}
          </Text>
        </Pressable>
        {SHOPPING_UNITS.map((u) => (
          <Pressable
            key={u}
            style={[styles.chip, unit === u && styles.chipOn]}
            onPress={() => setUnit(u)}
          >
            <Text style={[styles.chipText, unit === u && styles.chipTextOn]}>
              {t(`shopping.unit.${u}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  chipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 13 },
  chipTextOn: { color: colors.accentStrong },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13, marginTop: 10 },
  footer: { gap: 10 },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  deleteBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 15 },
})
