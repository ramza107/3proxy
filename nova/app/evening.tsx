import { addDays, format } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../components/Screen'
import { SoftPressable } from '../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { AnalyticsEvents, track } from '../lib/analytics'
import { dateLocale } from '../lib/dateLocale'
import { formatMoney, currentMonthKey, isPaidThisMonth } from '../lib/bills'
import { sortTasks, todayISO, useNovaStore } from '../lib/store'
import { useT } from '../lib/useT'
import { deleteTask, toggleTaskCompleted, updateTaskFields } from '../services/ai'
import type { Task } from '../types'

type Step = 'today' | 'tomorrow' | 'done'

function tomorrowISO() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

function taskMeta(task: Task) {
  return [task.time, task.priority].filter(Boolean).join(' · ')
}

const DUSK: [string, string, string] = ['#1A3A42', '#0F2A32', '#0A1F26']

export default function EveningClearScreen() {
  const t = useT()
  const router = useRouter()
  const tasks = useNovaStore((s) => s.tasks)
  const bills = useNovaStore((s) => s.bills)
  const userId = useNovaStore((s) => s.sessionUserId)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const [step, setStep] = useState<Step>('today')
  const [draft, setDraft] = useState('')
  const [movedCount, setMovedCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  const today = todayISO()
  const tomorrow = tomorrowISO()
  const locale = dateLocale(t.language)

  const todayOpen = useMemo(
    () =>
      sortTasks(
        tasks.filter(
          (task) => !task.completed && (task.date === today || !task.date),
        ),
      ),
    [tasks, today],
  )

  const tomorrowOpen = useMemo(
    () => sortTasks(tasks.filter((task) => !task.completed && task.date === tomorrow)),
    [tasks, tomorrow],
  )

  const doneToday = useMemo(() => {
    return sortTasks(
      tasks.filter((task) => {
        if (!task.completed) return false
        const stamp = task.completedAt || task.updated_at
        return typeof stamp === 'string' && stamp.startsWith(today)
      }),
    )
  }, [tasks, today])

  const billsPaidToday = useMemo(() => {
    const month = currentMonthKey()
    return bills.filter((b) => {
      if (!isPaidThisMonth(b, month)) return false
      return typeof b.updated_at === 'string' && b.updated_at.startsWith(today)
    })
  }, [bills, today])

  const finish = () => {
    updateSettings({ lastEveningClearDate: today })
    void track(AnalyticsEvents.eveningClearFinish)
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
    const batch = [...todayOpen]
    if (!batch.length) return
    let n = 0
    for (const task of batch) {
      await updateTaskFields(task, { date: tomorrow })
      n += 1
    }
    setMovedCount((c) => c + n)
    setStep('tomorrow')
  }

  const stepIndex = step === 'today' ? 0 : step === 'tomorrow' ? 1 : 2

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>{t('common.close')}</Text>
          </Pressable>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i <= stepIndex && styles.dotOn]} />
            ))}
          </View>
          <Text style={styles.stepHint}>
            {step === 'today'
              ? t('evening.stepToday')
              : step === 'tomorrow'
                ? t('evening.stepTomorrow')
                : t('common.done')}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(420)}>
            <LinearGradient colors={DUSK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <Text style={styles.heroKicker}>Wahrly</Text>
              <Text style={styles.heroTitle}>
                {step === 'done' ? t('evening.clearTitle') : t('evening.title')}
              </Text>
              <Text style={styles.heroSub}>
                {step === 'tomorrow'
                  ? format(addDays(new Date(), 1), 'EEEE, MMM d', { locale })
                  : step === 'done'
                    ? t('evening.clearSub')
                    : t('evening.sub')}
              </Text>
              {step === 'today' ? (
                <Text style={styles.heroMeta}>
                  {todayOpen.length} {t('home.openShort')} · {format(new Date(), 'EEEE', { locale })}
                </Text>
              ) : null}
            </LinearGradient>
          </Animated.View>

          {step === 'today' ? (
            <Animated.View key="today" entering={FadeInDown.duration(380).springify().damping(18)} style={styles.block}>
              {todayOpen.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>{t('evening.clearTitle')}</Text>
                  <Text style={styles.emptyText}>{t('evening.clearSub')}</Text>
                </View>
              ) : (
                <>
                  <SoftPressable style={styles.moveAll} onPress={moveAllTodayToTomorrow}>
                    <Text style={styles.moveAllTitle}>{t('evening.moveAll')}</Text>
                    <Text style={styles.moveAllSub}>
                      {todayOpen.length} · {t('common.continue')}
                    </Text>
                  </SoftPressable>

                  <View style={styles.list}>
                    {todayOpen.map((task, i) => (
                      <Animated.View
                        key={task.id}
                        entering={FadeInDown.delay(80 + i * 45).duration(320)}
                        style={styles.row}
                      >
                        <View style={styles.rowBody}>
                          <Text style={styles.rowTitle} numberOfLines={2}>
                            {task.title}
                          </Text>
                          {taskMeta(task) ? (
                            <Text style={styles.rowMeta}>{taskMeta(task)}</Text>
                          ) : null}
                          {!task.date ? (
                            <Text style={styles.undated}>{t('tasks.later')}</Text>
                          ) : null}
                        </View>
                        <View style={styles.actions}>
                          <SoftPressable style={styles.actionDone} onPress={() => onDone(task)}>
                            <Text style={styles.actionDoneText}>{t('evening.done')}</Text>
                          </SoftPressable>
                          <Pressable style={styles.action} onPress={() => onTomorrow(task)}>
                            <Text style={styles.actionText}>{t('evening.tomorrow')}</Text>
                          </Pressable>
                          <Pressable style={styles.actionGhost} onPress={() => onDrop(task)}>
                            <Text style={styles.actionGhostText}>{t('evening.drop')}</Text>
                          </Pressable>
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                </>
              )}

              <SoftPressable style={styles.primary} onPress={() => setStep('tomorrow')}>
                <Text style={styles.primaryText}>{t('common.continue')}</Text>
              </SoftPressable>
            </Animated.View>
          ) : null}

          {step === 'tomorrow' ? (
            <Animated.View key="tomorrow" entering={FadeInDown.duration(380).springify().damping(18)} style={styles.block}>
              <View style={styles.addRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={t('evening.addPh')}
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                  onSubmitEditing={addTomorrow}
                  returnKeyType="done"
                />
                <SoftPressable
                  style={[styles.addBtn, !draft.trim() && styles.addBtnOff]}
                  onPress={addTomorrow}
                  disabled={!draft.trim()}
                >
                  <Text style={styles.addBtnText}>{t('common.add')}</Text>
                </SoftPressable>
              </View>

              {tomorrowOpen.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>{t('evening.clearTitle')}</Text>
                  <Text style={styles.emptyText}>{t('evening.clearSub')}</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {tomorrowOpen.map((task, i) => (
                    <Animated.View
                      key={task.id}
                      entering={FadeInDown.delay(60 + i * 40).duration(300)}
                      style={styles.tomorrowRow}
                    >
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {task.title}
                      </Text>
                      {taskMeta(task) ? (
                        <Text style={styles.rowMeta}>{taskMeta(task)}</Text>
                      ) : null}
                    </Animated.View>
                  ))}
                </View>
              )}

              {todayOpen.length > 0 ? (
                <View style={styles.leftover}>
                  <Text style={styles.leftoverLabel}>{t('common.today')}</Text>
                  <Pressable style={styles.moveAllCompact} onPress={moveAllTodayToTomorrow}>
                    <Text style={styles.moveAllCompactText}>{t('evening.moveAll')}</Text>
                  </Pressable>
                  {todayOpen.map((task) => (
                    <View key={task.id} style={styles.leftoverRow}>
                      <Text style={styles.leftoverTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <Pressable onPress={() => onTomorrow(task)}>
                        <Text style={styles.leftoverAction}>→ {t('evening.tomorrow')}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              <SoftPressable style={styles.primary} onPress={finish}>
                <Text style={styles.primaryText}>{t('evening.finish')}</Text>
              </SoftPressable>
              <Pressable style={styles.link} onPress={() => setStep('today')}>
                <Text style={styles.linkText}>{t('common.today')}</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {step === 'done' ? (
            <Animated.View key="done" entering={FadeInDown.duration(400).springify().damping(17)} style={styles.block}>
              <Text style={styles.lead}>
                {doneCount || movedCount || doneToday.length
                  ? t.tf('evening.summary', {
                      done: Math.max(doneCount, doneToday.length),
                      moved: movedCount,
                      tomorrow: tomorrowOpen.length,
                    })
                  : t('evening.clearSub')}
              </Text>

              {doneToday.length || billsPaidToday.length ? (
                <View style={styles.digest}>
                  <Text style={styles.digestTitle}>{t('evening.digestTitle')}</Text>
                  {doneToday.slice(0, 8).map((task) => (
                    <Text key={task.id} style={styles.digestLine} numberOfLines={1}>
                      ✓ {task.title}
                      {task.sourceKind === 'promise'
                        ? ` · ${t('home.iOwe')}`
                        : task.sourceKind === 'meeting'
                          ? ` · ${t('home.waiting')}`
                          : ''}
                    </Text>
                  ))}
                  {billsPaidToday.map((bill) => (
                    <Text key={bill.id} style={styles.digestLine} numberOfLines={1}>
                      ✓ {bill.title} · {formatMoney(bill.amount, bill.currency)}
                    </Text>
                  ))}
                </View>
              ) : null}

              <SoftPressable style={styles.primary} onPress={() => router.replace('/tasks')}>
                <Text style={styles.primaryText}>{t('evening.back')}</Text>
              </SoftPressable>
            </Animated.View>
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
    gap: 10,
  },
  back: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 15 },
  dots: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'center' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotOn: { backgroundColor: colors.accent, width: 16 },
  stepHint: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
    gap: 16,
  },
  hero: {
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 4,
    overflow: 'hidden',
  },
  heroKicker: {
    color: 'rgba(247,251,250,0.55)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.textOnAccent,
    fontFamily: fonts.brand,
    fontSize: 32,
    letterSpacing: -0.6,
  },
  heroSub: {
    color: 'rgba(247,251,250,0.78)',
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  heroMeta: {
    color: 'rgba(247,251,250,0.55)',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 8,
  },
  block: { gap: 14 },
  lead: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  digest: {
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  digestTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  digestLine: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  list: { gap: 10 },
  row: {
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
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
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  primary: {
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  moveAll: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 16,
    gap: 4,
  },
  moveAllTitle: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  moveAllSub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  moveAllCompact: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
  },
  moveAllCompactText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bgCardSolid,
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
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
    gap: 3,
  },
  leftover: {
    marginTop: 4,
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
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
