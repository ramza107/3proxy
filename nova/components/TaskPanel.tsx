import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { recurrenceLabel } from '../lib/taskExtras'
import {
  addChecklistItem,
  removeChecklistItem,
  setMonthlyRecurrence,
  toggleChecklistItem,
  updateTaskFields,
} from '../services/ai'

type Props = {
  task: Task
  onClose?: () => void
}

const MONTH_DAYS = [1, 5, 10, 15, 20, 25, 28]

export function TaskPanel({ task }: Props) {
  const [draft, setDraft] = useState('')
  const checklist = task.checklist || []
  const monthly = task.recurrence?.type === 'monthly' ? task.recurrence.dayOfMonth : null

  const addItem = async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    await addChecklistItem(task, text)
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionLabel}>Shopping list</Text>
      {checklist.length === 0 ? (
        <Text style={styles.hint}>Add items to tick off in the store.</Text>
      ) : (
        <View style={styles.items}>
          {checklist.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Pressable
                onPress={() => toggleChecklistItem(task, item.id)}
                style={styles.itemCheckWrap}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.done }}
              >
                <View style={[styles.itemCheck, item.done && styles.itemCheckOn]}>
                  {item.done ? <Text style={styles.itemCheckMark}>✓</Text> : null}
                </View>
              </Pressable>
              <Text style={[styles.itemText, item.done && styles.itemTextDone]} numberOfLines={2}>
                {item.text}
              </Text>
              <Pressable onPress={() => removeChecklistItem(task, item.id)} hitSlop={8}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Milk, bread…"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          onSubmitEditing={addItem}
          returnKeyType="done"
        />
        <Pressable
          onPress={addItem}
          style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.addItemText}>Add</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Repeat monthly</Text>
      <Text style={styles.hint}>
        {monthly
          ? recurrenceLabel(task.recurrence) || `Day ${monthly}`
          : 'Pick a day of the month — task returns after you complete it.'}
      </Text>
      <View style={styles.dayRow}>
        {MONTH_DAYS.map((day) => {
          const on = monthly === day
          return (
            <Pressable
              key={day}
              onPress={() => setMonthlyRecurrence(task, on ? null : day)}
              style={[styles.dayChip, on && styles.dayChipOn]}
            >
              <Text style={[styles.dayText, on && styles.dayTextOn]}>{day}</Text>
            </Pressable>
          )
        })}
      </View>
      {monthly ? (
        <Pressable
          onPress={() => setMonthlyRecurrence(task, null)}
          style={styles.clearRepeat}
        >
          <Text style={styles.clearRepeatText}>Turn off monthly repeat</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            const d = task.date ? Number(task.date.slice(8, 10)) : new Date().getDate()
            setMonthlyRecurrence(task, d)
          }}
          style={styles.clearRepeat}
        >
          <Text style={styles.clearRepeatText}>Use this task’s calendar day</Text>
        </Pressable>
      )}

      {!task.completed && monthly ? (
        <Text style={styles.footNote}>
          When you complete it, Wahrly moves it to next month and clears the shopping ticks.
        </Text>
      ) : null}

      {task.priority !== 'high' ? (
        <Pressable
          onPress={() => updateTaskFields(task, { priority: 'high' })}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Mark high priority</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    marginTop: -4,
    marginBottom: 4,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  sectionLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  items: { gap: 6 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemCheckWrap: { padding: 2 },
  itemCheck: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCheckOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  itemCheckMark: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  itemText: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  itemTextDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  remove: {
    color: colors.textDim,
    fontSize: 14,
    paddingHorizontal: 4,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  addItemBtn: {
    backgroundColor: colors.bgDeep,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  addItemText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    minWidth: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
  },
  dayChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  dayText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  dayTextOn: {
    color: colors.accentStrong,
  },
  clearRepeat: {
    paddingVertical: 4,
  },
  clearRepeatText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  footNote: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  secondary: {
    marginTop: 4,
    paddingVertical: 6,
  },
  secondaryText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
})
