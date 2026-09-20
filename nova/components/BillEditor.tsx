import { useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { Bill } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { BILL_CATEGORIES } from '../lib/bills'
import { BottomSheet } from './BottomSheet'

type Props = {
  bill: Bill | null
  visible: boolean
  /** When true, create mode (bill may be a draft template) */
  creating?: boolean
  onClose: () => void
  onSave: (patch: {
    title: string
    amount: number
    currency: string
    dayOfMonth: number
    category: string
    notes: string | null
    active: boolean
  }) => void
  onDelete?: () => void
}

export function BillEditor({ bill, visible, creating, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('UAH')
  const [day, setDay] = useState('1')
  const [category, setCategory] = useState('General')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setTitle(bill?.title || '')
    setAmount(bill ? String(bill.amount) : '')
    setCurrency(bill?.currency || 'UAH')
    setDay(String(bill?.dayOfMonth || 1))
    setCategory(bill?.category || 'General')
    setNotes(bill?.notes || '')
    setActive(bill?.active !== false)
    setError('')
  }, [bill, visible])

  const save = () => {
    const nextTitle = title.trim()
    const nextAmount = Number(String(amount).replace(',', '.'))
    const nextDay = Number(day)
    if (!nextTitle) {
      setError('Name is required')
      return
    }
    if (!Number.isFinite(nextAmount) || nextAmount < 0) {
      setError('Enter a valid amount')
      return
    }
    if (!Number.isFinite(nextDay) || nextDay < 1 || nextDay > 28) {
      setError('Day must be 1–28')
      return
    }
    onSave({
      title: nextTitle,
      amount: nextAmount,
      currency: currency.trim().toUpperCase() || 'UAH',
      dayOfMonth: Math.round(nextDay),
      category: category.trim() || 'General',
      notes: notes.trim() || null,
      active,
    })
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={creating ? 'New payment' : 'Edit payment'}
    >
      <Text style={styles.label}>Name</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="Rent, Netflix…"
        placeholderTextColor={colors.textDim}
      />

      <View style={styles.row2}>
        <View style={{ flex: 1.4 }}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Currency</Text>
          <TextInput
            value={currency}
            onChangeText={setCurrency}
            style={styles.input}
            placeholder="UAH"
            placeholderTextColor={colors.textDim}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <Text style={styles.label}>Day of month (1–28)</Text>
      <View style={styles.chips}>
        {[1, 5, 10, 15, 20, 25, 28].map((d) => (
          <Pressable
            key={d}
            style={[styles.chip, Number(day) === d && styles.chipOn]}
            onPress={() => setDay(String(d))}
          >
            <Text style={[styles.chipText, Number(day) === d && styles.chipTextOn]}>{d}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={day}
        onChangeText={setDay}
        style={styles.input}
        placeholder="1"
        placeholderTextColor={colors.textDim}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {BILL_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, category === c && styles.chipOn]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, { minHeight: 64 }]}
        placeholder="Optional"
        placeholderTextColor={colors.textDim}
        multiline
      />

      <Pressable style={styles.toggleRow} onPress={() => setActive((v) => !v)}>
        <Text style={styles.toggleLabel}>Active each month</Text>
        <Text style={styles.toggleValue}>{active ? 'On' : 'Paused'}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.save} onPress={save}>
        <Text style={styles.saveText}>{creating ? 'Add payment' : 'Save'}</Text>
      </Pressable>

      {!creating && onDelete ? (
        <Pressable
          style={styles.danger}
          onPress={() => {
            onDelete()
            onClose()
          }}
        >
          <Text style={styles.dangerText}>Delete</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={onClose} style={styles.cancel}>
        <Text style={styles.cancelText}>Close</Text>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  label: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  row2: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextOn: { color: colors.accentStrong },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toggleLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  toggleValue: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fonts.body, marginTop: 8 },
  save: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  danger: {
    marginTop: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.danger,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { color: colors.danger, fontFamily: fonts.bodyBold },
  cancel: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: colors.textMuted, fontFamily: fonts.bodyMedium },
})
