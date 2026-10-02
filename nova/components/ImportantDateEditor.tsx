import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { useT } from '../lib/useT'
import {
  IMPORTANT_DATE_KINDS,
  type ImportantDate,
  type ImportantDateKind,
} from '../types'
import { BottomSheet } from './BottomSheet'

type Props = {
  date: ImportantDate | null
  visible: boolean
  creating?: boolean
  onClose: () => void
  onSave: (patch: {
    title: string
    kind: ImportantDateKind
    month: number
    day: number
    year: number | null
    person: string | null
    notes: string | null
    remindEnabled: boolean
    remindLeadDays: number
  }) => void
  onDelete?: () => void
}

export function ImportantDateEditor({
  date,
  visible,
  creating,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const t = useT()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ImportantDateKind>('birthday')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [person, setPerson] = useState('')
  const [notes, setNotes] = useState('')
  const [remindEnabled, setRemindEnabled] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setTitle(date?.title || '')
    setKind(date?.kind || 'birthday')
    setMonth(date ? String(date.month) : '')
    setDay(date ? String(date.day) : '')
    setYear(date?.year ? String(date.year) : '')
    setPerson(date?.person || '')
    setNotes(date?.notes || '')
    setRemindEnabled(date?.remindEnabled !== false)
    setError('')
  }, [date, visible])

  const save = () => {
    const nextTitle = title.trim()
    if (!nextTitle) {
      setError(t('editor.nameRequired'))
      return
    }
    const m = Number(month)
    const d = Number(day)
    if (!Number.isFinite(m) || m < 1 || m > 12) {
      setError(t('dates.monthInvalid'))
      return
    }
    if (!Number.isFinite(d) || d < 1 || d > 31) {
      setError(t('dates.dayInvalid'))
      return
    }
    const yRaw = year.trim()
    const y = yRaw ? Number(yRaw) : null
    if (yRaw && (!Number.isFinite(y) || (y as number) < 1900 || (y as number) > 2100)) {
      setError(t('dates.yearInvalid'))
      return
    }
    onSave({
      title: nextTitle,
      kind,
      month: Math.round(m),
      day: Math.round(d),
      year: y,
      person: person.trim() || null,
      notes: notes.trim() || null,
      remindEnabled,
      remindLeadDays: 14,
    })
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={creating ? t('dates.newDate') : t('dates.editDate')}
      subtitle={t('dates.remindHint')}
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
      <Text style={styles.label}>{t('auth.name')}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder={t('dates.titlePh')}
        placeholderTextColor={colors.textDim}
      />

      <Text style={styles.label}>{t('dates.kind')}</Text>
      <View style={styles.chips}>
        {IMPORTANT_DATE_KINDS.map((k) => (
          <Pressable
            key={k}
            style={[styles.chip, kind === k && styles.chipOn]}
            onPress={() => setKind(k)}
          >
            <Text style={[styles.chipText, kind === k && styles.chipTextOn]}>
              {t(`dates.kind.${k}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row3}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('dates.day')}</Text>
          <TextInput
            value={day}
            onChangeText={setDay}
            style={styles.input}
            placeholder="15"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('dates.month')}</Text>
          <TextInput
            value={month}
            onChangeText={setMonth}
            style={styles.input}
            placeholder="3"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flex: 1.2 }}>
          <Text style={styles.label}>{t('dates.yearOpt')}</Text>
          <TextInput
            value={year}
            onChangeText={setYear}
            style={styles.input}
            placeholder="1990"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Text style={styles.label}>{t('dates.person')}</Text>
      <TextInput
        value={person}
        onChangeText={setPerson}
        style={styles.input}
        placeholder={t('dates.personPh')}
        placeholderTextColor={colors.textDim}
      />

      <Text style={styles.label}>{t('editor.notes')}</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, styles.notes]}
        placeholder={t('dates.notesPh')}
        placeholderTextColor={colors.textDim}
        multiline
      />

      <Pressable style={styles.toggleRow} onPress={() => setRemindEnabled((v) => !v)}>
        <Text style={styles.toggleLabel}>{t('dates.remind')}</Text>
        <Text style={styles.toggleValue}>{remindEnabled ? t('common.on') : t('common.off')}</Text>
      </Pressable>

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
  row3: { flexDirection: 'row', gap: 8 },
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
  toggleRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  toggleValue: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 14 },
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
