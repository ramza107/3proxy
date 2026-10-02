import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { useT } from '../lib/useT'
import { BODY_ENTRY_KINDS, type BodyEntry, type BodyEntryKind } from '../types'
import { BottomSheet } from './BottomSheet'

type Props = {
  entry: BodyEntry | null
  visible: boolean
  creating?: boolean
  onClose: () => void
  onSave: (patch: {
    title: string
    kind: BodyEntryKind
    date: string | null
    provider: string | null
    notes: string | null
  }) => void
  onDelete?: () => void
}

export function BodyEntryEditor({ entry, visible, creating, onClose, onSave, onDelete }: Props) {
  const t = useT()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<BodyEntryKind>('visit')
  const [date, setDate] = useState('')
  const [provider, setProvider] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) return
    setTitle(entry?.title || '')
    setKind(entry?.kind || 'visit')
    setDate(entry?.date || '')
    setProvider(entry?.provider || '')
    setNotes(entry?.notes || '')
    setError('')
  }, [entry, visible])

  const save = () => {
    const nextTitle = title.trim()
    if (!nextTitle) {
      setError(t('editor.nameRequired'))
      return
    }
    const d = date.trim()
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setError(t('life.dateFmt'))
      return
    }
    onSave({
      title: nextTitle,
      kind,
      date: d || null,
      provider: provider.trim() || null,
      notes: notes.trim() || null,
    })
    onClose()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={creating ? t('body.newEntry') : t('body.editEntry')}
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
        placeholder={t('body.titlePh')}
        placeholderTextColor={colors.textDim}
      />

      <Text style={styles.label}>{t('body.kind')}</Text>
      <View style={styles.chips}>
        {BODY_ENTRY_KINDS.map((k) => (
          <Pressable
            key={k}
            style={[styles.chip, kind === k && styles.chipOn]}
            onPress={() => setKind(k)}
          >
            <Text style={[styles.chipText, kind === k && styles.chipTextOn]}>
              {t(`body.kind.${k}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('editor.date')}</Text>
      <TextInput
        value={date}
        onChangeText={setDate}
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
      />

      <Text style={styles.label}>{t('body.provider')}</Text>
      <TextInput
        value={provider}
        onChangeText={setProvider}
        style={styles.input}
        placeholder={t('body.providerPh')}
        placeholderTextColor={colors.textDim}
      />

      <Text style={styles.label}>{t('editor.notes')}</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, styles.notes]}
        placeholder={t('body.notesPh')}
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
  notes: { minHeight: 72, textAlignVertical: 'top' },
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
