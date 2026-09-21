import { addDays, format, parseISO } from 'date-fns'
import { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { parseHm } from '../lib/notifications'
import type { Dow, Priority, Task, TaskRecurrence } from '../types'

type Props = {
  task: Task | null
  visible: boolean
  onClose: () => void
  onSave: (
    patch: Partial<Pick<Task, 'title' | 'date' | 'time' | 'priority' | 'recurrence'>>,
  ) => void
  onComplete: () => void
  onDelete: () => void
}

const PRIORITIES: Priority[] = ['high', 'medium', 'low']
const DOW_SHORT: { key: Dow; label: string }[] = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 0, label: 'Sun' },
]

function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

function tomorrow() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

function plusDays(n: number) {
  return format(addDays(new Date(), n), 'yyyy-MM-dd')
}

export function TaskEditor({ task, visible, onClose, onSave, onComplete, onDelete }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [recFreq, setRecFreq] = useState<'none' | 'daily' | 'weekly'>('none')
  const [recDays, setRecDays] = useState<Dow[]>([1, 2, 3, 4, 5])
  const [error, setError] = useState('')
  // Web: the same click that opens the modal can hit the backdrop and close it instantly.
  const [canDismiss, setCanDismiss] = useState(false)

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDate(task.date || '')
    setTime(task.time || '')
    setPriority(task.priority)
    if (task.recurrence?.freq === 'daily') {
      setRecFreq('daily')
      setRecDays(task.recurrence.days || [1, 2, 3, 4, 5])
    } else if (task.recurrence?.freq === 'weekly') {
      setRecFreq('weekly')
      setRecDays(task.recurrence.days?.length ? task.recurrence.days : [1])
    } else {
      setRecFreq('none')
    }
    setError('')
  }, [task])

  useEffect(() => {
    if (!visible) {
      setCanDismiss(false)
      return
    }
    setCanDismiss(false)
    const timer = setTimeout(() => setCanDismiss(true), 150)
    return () => clearTimeout(timer)
  }, [visible])

  if (!task) return null

  const dismiss = () => {
    if (!canDismiss) return
    onClose()
  }

  const save = () => {
    const nextTitle = title.trim()
    if (!nextTitle) {
      setError('Title cannot be empty')
      return
    }
    if (time && !parseHm(time)) {
      setError('Time must be HH:MM')
      return
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Date must be YYYY-MM-DD')
      return
    }
    let recurrence: TaskRecurrence | null = null
    if (recFreq === 'daily') recurrence = { freq: 'daily' }
    if (recFreq === 'weekly') {
      recurrence = { freq: 'weekly', days: recDays.length ? recDays : [1] }
    }
    onSave({
      title: nextTitle,
      date: date || null,
      time: time || null,
      priority,
      recurrence,
    })
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Close editor" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.heading}>Edit task</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="Task title"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Date</Text>
            <View style={styles.row}>
              {(
                [
                  ['Today', today()],
                  ['Tomorrow', tomorrow()],
                  ['+3 days', plusDays(3)],
                  ['+1 week', plusDays(7)],
                  ['Clear', ''],
                ] as const
              ).map(([label, value]) => (
                <Pressable
                  key={label}
                  style={[styles.chip, date === value && styles.chipOn]}
                  onPress={() => setDate(value)}
                >
                  <Text style={[styles.chipText, date === value && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={date}
              onChangeText={setDate}
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Time</Text>
            <View style={styles.row}>
              {['09:00', '12:00', '15:00', '18:00', ''].map((t) => (
                <Pressable
                  key={t || 'none'}
                  style={[styles.chip, time === t && styles.chipOn]}
                  onPress={() => setTime(t)}
                >
                  <Text style={[styles.chipText, time === t && styles.chipTextOn]}>
                    {t || 'None'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={time}
              onChangeText={setTime}
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.row}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  style={[styles.chip, priority === p && styles.chipOn]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.chipText, priority === p && styles.chipTextOn]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Repeat</Text>
            <View style={styles.row}>
              {(
                [
                  ['none', 'Once'],
                  ['daily', 'Daily'],
                  ['weekly', 'Weekly'],
                ] as const
              ).map(([id, label]) => (
                <Pressable
                  key={id}
                  style={[styles.chip, recFreq === id && styles.chipOn]}
                  onPress={() => setRecFreq(id)}
                >
                  <Text style={[styles.chipText, recFreq === id && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {recFreq === 'weekly' ? (
              <View style={styles.row}>
                {DOW_SHORT.map(({ key, label }) => {
                  const on = recDays.includes(key)
                  return (
                    <Pressable
                      key={key}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() =>
                        setRecDays((prev) =>
                          on ? prev.filter((d) => d !== key) : [...prev, key].sort(),
                        )
                      }
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}
            {recFreq !== 'none' ? (
              <Text style={styles.hint}>Completing spawns the next occurrence automatically.</Text>
            ) : null}

            <Text style={styles.label}>Quick move</Text>
            <View style={styles.row}>
              <Pressable
                style={styles.action}
                onPress={() => {
                  onSave({ date: today() })
                  onClose()
                }}
              >
                <Text style={styles.actionText}>→ Today</Text>
              </Pressable>
              <Pressable
                style={styles.action}
                onPress={() => {
                  onSave({ date: tomorrow() })
                  onClose()
                }}
              >
                <Text style={styles.actionText}>→ Tomorrow</Text>
              </Pressable>
              <Pressable
                style={styles.action}
                onPress={() => {
                  const base = task.date ? parseISO(task.date) : new Date()
                  onSave({ date: format(addDays(base, 1), 'yyyy-MM-dd') })
                  onClose()
                }}
              >
                <Text style={styles.actionText}>Postpone +1</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Save changes</Text>
            </Pressable>

            <View style={styles.footerRow}>
              <Pressable style={styles.secondary} onPress={onComplete}>
                <Text style={styles.secondaryText}>
                  {task.completed ? 'Mark active' : 'Complete'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.danger}
                onPress={() => {
                  onDelete()
                  onClose()
                }}
              >
                <Text style={styles.dangerText}>Delete</Text>
              </Pressable>
            </View>

            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,42,50,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
    gap: 6,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 10,
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  label: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13, textTransform: 'capitalize' },
  chipTextOn: { color: colors.accentStrong },
  action: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  save: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondary: {
    flex: 1,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontFamily: fonts.bodyBold },
  danger: {
    flex: 1,
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
  error: { color: colors.danger, fontFamily: fonts.body, marginTop: 8 },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
})
