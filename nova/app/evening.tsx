import { addDays, format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../components/Screen'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { sortTasks, todayISO, useNovaStore } from '../lib/store'
import { deleteTask, toggleTaskCompleted, updateTaskFields } from '../services/ai'
import type { Task } from '../types'

type Step = 'today' | 'tomorrow' | 'done'

/** Local calendar date — must match todayISO() from the store. */
function tomorrowISO() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

function taskMeta(task: Task) {
  return [task.time, task.priority].filter(Boolean).join(' · ')
}

export default function EveningClearScreen() {
  const router = useRouter()
  const tasks = useNovaStore((s) => s.tasks)
  const userId = useNovaStore((s) => s.sessionUserId)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const [step, setStep] = useState<Step>('today')
  const [draft, setDraft] = useState('')
  const [movedCount, setMovedCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  const today = todayISO()
  const tomorrow = tomorrowISO()

  const todayOpen = useMemo(
    () =>
      sortTasks(
        tasks.filter(
          (t) => !t.completed && (t.date === today || !t.date),
        ),
      ),
    [tasks, today],
  )

  const tomorrowOpen = useMemo(
    () => sortTasks(tasks.filter((t) => !t.completed && t.date === tomorrow)),
    [tasks, tomorrow],
  )

  const finish = () => {
    updateSettings({ lastEveningClearDate: today })
    setStep('done')
  }

  const onDone = async (task: Task) => {
    await toggleTaskCompleted(task)
    setDoneCount((n) => n + 1)
  }

  const onTomorrow = async (task: Task) => {
    await updateTaskFields(task, { date: tomorrow })
    setMovedCount((n) => n + 1)
  }

  const onDrop = async (task: Task) => {
    await deleteTask(task.id)
  }

  const addTomorrow = () => {
    const title = draft.trim()
    if (!title || !userId) return
    createTaskLocal({
      title,
      date: tomorrow,
      userId,
      priority: 'medium',
    })
    setDraft('')
  }

  const moveAllTodayToTomorrow = async () => {
    for (const task of todayOpen) {
      await updateTaskFields(task, { date: tomorrow })
      setMovedCount((n) => n + 1)
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>Close</Text>
          </Pressable>
          <Text style={styles.stepHint}>
            {step === 'today' ? '1 · Today' : step === 'tomorrow' ? '2 · Tomorrow' : 'Done'}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'today' ? (
            <>
              <Text style={styles.brand}>Evening Clear</Text>
              <Text style={styles.lead}>Close what you can. Move what still matters.</Text>

              {todayOpen.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>Today is clear</Text>
                  <Text style={styles.emptyText}>Nothing left open — shape tomorrow next.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {todayOpen.map((task) => (
                    <View key={task.id} style={styles.row}>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {task.title}
                        </Text>
                        {taskMeta(task) ? (
                          <Text style={styles.rowMeta}>{taskMeta(task)}</Text>
                        ) : null}
                        {!task.date ? (
                          <Text style={styles.undated}>No date</Text>
                        ) : null}
                      </View>
                      <View style={styles.actions}>
                        <Pressable style={styles.actionDone} onPress={() => onDone(task)}>
                          <Text style={styles.actionDoneText}>Done</Text>
                        </Pressable>
                        <Pressable style={styles.action} onPress={() => onTomorrow(task)}>
                          <Text style={styles.actionText}>Tomorrow</Text>
                        </Pressable>
                        <Pressable style={styles.actionGhost} onPress={() => onDrop(task)}>
                          <Text style={styles.actionGhostText}>Drop</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {todayOpen.length > 1 ? (
                <Pressable style={styles.secondary} onPress={moveAllTodayToTomorrow}>
                  <Text style={styles.secondaryText}>Move all to tomorrow</Text>
                </Pressable>
              ) : null}

              <Pressable style={styles.primary} onPress={() => setStep('tomorrow')}>
                <Text style={styles.primaryText}>
                  {todayOpen.length ? 'Continue' : 'Shape tomorrow'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {step === 'tomorrow' ? (
            <>
              <Text style={styles.brand}>Tomorrow</Text>
              <Text style={styles.lead}>
                {format(addDays(new Date(), 1), 'EEEE, MMM d')} — add only what matters.
              </Text>

              <View style={styles.addRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Add for tomorrow…"
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  onSubmitEditing={addTomorrow}
                  returnKeyType="done"
                />
                <Pressable
                  style={[styles.addBtn, !draft.trim() && styles.addBtnOff]}
                  onPress={addTomorrow}
                  disabled={!draft.trim()}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>

              {tomorrowOpen.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>Tomorrow is empty</Text>
                  <Text style={styles.emptyText}>
                    That can be fine. Add one thing if you know it already.
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {tomorrowOpen.map((task) => (
                    <View key={task.id} style={styles.tomorrowRow}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {task.title}
                      </Text>
                      {taskMeta(task) ? (
                        <Text style={styles.rowMeta}>{taskMeta(task)}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {todayOpen.length > 0 ? (
                <View style={styles.leftover}>
                  <Text style={styles.leftoverLabel}>Still on today</Text>
                  {todayOpen.map((task) => (
                    <View key={task.id} style={styles.leftoverRow}>
                      <Text style={styles.leftoverTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Pressable onPress={() => onTomorrow(task)}>
                        <Text style={styles.leftoverAction}>→ Tomorrow</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable style={styles.primary} onPress={finish}>
                <Text style={styles.primaryText}>Finish Evening Clear</Text>
              </Pressable>
              <Pressable style={styles.link} onPress={() => setStep('today')}>
                <Text style={styles.linkText}>Back to today</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <Text style={styles.brand}>You&apos;re clear</Text>
              <Text style={styles.lead}>
                {doneCount || movedCount
                  ? [
                      doneCount ? `${doneCount} done` : null,
                      movedCount ? `${movedCount} moved to tomorrow` : null,
                      `${tomorrowOpen.length} on tomorrow`,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `${tomorrowOpen.length} on tomorrow. Rest well.`}
              </Text>
              <Pressable style={styles.primary} onPress={() => router.replace('/home')}>
                <Text style={styles.primaryText}>Back home</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  back: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 15 },
  stepHint: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
    gap: 14,
  },
  brand: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 34,
    letterSpacing: -0.7,
  },
  lead: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    marginTop: -6,
    marginBottom: 8,
  },
  list: { gap: 10 },
  row: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  rowBody: { gap: 3 },
  rowTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16 },
  rowMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  undated: { color: colors.warning, fontFamily: fonts.body, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionDone: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionDoneText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  action: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13 },
  actionGhost: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionGhostText: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
  empty: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  primary: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  secondary: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  secondaryText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 14 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
  tomorrowRow: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 3,
  },
  leftover: {
    marginTop: 4,
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leftoverLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  leftoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftoverTitle: { flex: 1, color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  leftoverAction: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: colors.textMuted, fontFamily: fonts.bodyMedium },
})
