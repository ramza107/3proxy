import { useMemo, useState } from 'react'
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, fonts, radii } from '../constants/theme'
import { useNovaStore } from '../lib/store'
import { useT } from '../lib/useT'
import type { Task } from '../types'
import { HomeSection } from './HomeSection'

type Props = {
  userId: string | null
}

type LoopKind = 'promise' | 'meeting'

/**
 * First-class social loops: “I owe” vs “Waiting”.
 * Local tasks with sourceKind promise/meeting are the source of truth.
 */
export function OpenLoopsBrief({ userId }: Props) {
  const t = useT()
  const snoozedLoops = useNovaStore((s) => s.snoozedLoops)
  const snoozeLoop = useNovaStore((s) => s.snoozeLoop)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const upsertTask = useNovaStore((s) => s.upsertTask)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)
  const tasks = useNovaStore((s) => s.tasks)

  const [adding, setAdding] = useState(false)
  const [draftKind, setDraftKind] = useState<LoopKind>('promise')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftWho, setDraftWho] = useState('')

  const isSnoozed = (id: string) => {
    const until = snoozedLoops[id]
    return !!until && new Date(until).getTime() > Date.now()
  }

  const snoozeUntilDays = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(9, 0, 0, 0)
    return d.toISOString()
  }

  const onSnooze = (id: string) => {
    Alert.alert(t('home.snoozeTitle'), t('home.snoozeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('home.snooze1d'), onPress: () => snoozeLoop(id, snoozeUntilDays(1)) },
      { text: t('home.snooze3d'), onPress: () => snoozeLoop(id, snoozeUntilDays(3)) },
      { text: t('home.snoozeWeek'), onPress: () => snoozeLoop(id, snoozeUntilDays(7)) },
    ])
  }

  const openTasks = useMemo(() => tasks.filter((x) => !x.completed), [tasks])

  const oweFromTasks = useMemo(
    () => openTasks.filter((task) => task.sourceKind === 'promise' && !isSnoozed(task.id)),
    [openTasks, snoozedLoops],
  )

  const waitingFromTasks = useMemo(
    () => openTasks.filter((task) => task.sourceKind === 'meeting' && !isSnoozed(task.id)),
    [openTasks, snoozedLoops],
  )

  if (!userId) return null

  const oweCount = oweFromTasks.length
  const waitCount = waitingFromTasks.length
  const total = oweCount + waitCount

  const completeLinkedTasks = (sourceId: string) => {
    const now = new Date().toISOString()
    for (const task of useNovaStore.getState().tasks) {
      if (task.completed || task.sourceId !== sourceId) continue
      upsertTask({ ...task, completed: true, completedAt: now, updated_at: now })
    }
  }

  const onDoneTaskLoop = (task: Task) => {
    if (task.sourceId) completeLinkedTasks(task.sourceId)
    const now = new Date().toISOString()
    upsertTask({ ...task, completed: true, completedAt: now, updated_at: now })
  }

  const resetDraft = () => {
    setAdding(false)
    setDraftTitle('')
    setDraftWho('')
    setDraftKind('promise')
  }

  const openComposer = (kind: LoopKind, titleSeed = '') => {
    setDraftKind(kind)
    setDraftTitle(titleSeed)
    setDraftWho('')
    setAdding(true)
  }

  const saveManualLoop = () => {
    const uidUser = sessionUserId || userId
    if (!uidUser) return
    const title = draftTitle.trim()
    if (!title) return
    const who = draftWho.trim()
    const labeled =
      who.length === 0
        ? title
        : draftKind === 'promise'
          ? `${title} → ${who}`
          : `${who}: ${title}`
    createTaskLocal({
      title: labeled,
      priority: 'high',
      userId: uidUser,
      sourceKind: draftKind,
      sourceId: `loop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    })
    resetDraft()
  }

  const templates = [
    { kind: 'promise' as const, label: t('home.loopTplOweReply'), seed: t('home.loopTplOweReply') },
    { kind: 'promise' as const, label: t('home.loopTplOweSend'), seed: t('home.loopTplOweSend') },
    {
      kind: 'meeting' as const,
      label: t('home.loopTplWaitDecision'),
      seed: t('home.loopTplWaitDecision'),
    },
    {
      kind: 'meeting' as const,
      label: t('home.loopTplWaitReply'),
      seed: t('home.loopTplWaitReply'),
    },
  ]

  return (
    <HomeSection
      title={t('home.openLoops')}
      meta={total ? t.tf('home.openCount', { n: total }) : t('home.clear')}
      action={
        <View style={styles.actionRow}>
          {total > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{total}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => setAdding((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('home.addLoop')}
          >
            <Text style={styles.refresh}>{adding ? t('home.close') : t('home.addLoop')}</Text>
          </Pressable>
        </View>
      }
    >
      <Text style={styles.summary}>{t('home.loopsIntro')}</Text>

      {adding ? (
        <View style={styles.composer}>
          <View style={styles.kindRow}>
            <Pressable
              style={[styles.kindChip, draftKind === 'promise' && styles.kindChipOn]}
              onPress={() => setDraftKind('promise')}
            >
              <Text style={[styles.kindText, draftKind === 'promise' && styles.kindTextOn]}>
                {t('home.iOwe')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.kindChip, draftKind === 'meeting' && styles.kindChipOn]}
              onPress={() => setDraftKind('meeting')}
            >
              <Text style={[styles.kindText, draftKind === 'meeting' && styles.kindTextOn]}>
                {t('home.waiting')}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.composerHint}>
            {draftKind === 'promise' ? t('home.loopHintOwe') : t('home.loopHintWait')}
          </Text>
          <TextInput
            value={draftTitle}
            onChangeText={setDraftTitle}
            placeholder={t('home.loopTitlePlaceholder')}
            placeholderTextColor={colors.textDim}
            style={styles.input}
            autoFocus
          />
          <TextInput
            value={draftWho}
            onChangeText={setDraftWho}
            placeholder={t('home.loopWhoPlaceholder')}
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
          <View style={styles.actions}>
            <Pressable
              style={[styles.addBtn, !draftTitle.trim() && styles.addBtnOff]}
              onPress={saveManualLoop}
              disabled={!draftTitle.trim()}
            >
              <Text style={styles.addBtnText}>{t('home.addLoop')}</Text>
            </Pressable>
            <Pressable onPress={resetDraft} hitSlop={8}>
              <Text style={styles.dismiss}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {total === 0 && !adding ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.quiet}>{t('home.loopsEmptyPrompt')}</Text>
          <View style={styles.tplRow}>
            {templates.map((tpl) => (
              <Pressable
                key={`${tpl.kind}-${tpl.label}`}
                style={styles.tplChip}
                onPress={() => openComposer(tpl.kind, tpl.seed)}
              >
                <Text style={styles.tplText}>{tpl.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <>
          {oweCount > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>{t('home.iOwe')}</Text>
              {oweFromTasks.map((task) => (
                <TaskLoopRow
                  key={task.id}
                  task={task}
                  kindLabel={t('home.iOwe')}
                  doneLabel={t('home.loopClosed')}
                  snoozeLabel={t('home.snooze')}
                  onDone={() => onDoneTaskLoop(task)}
                  onSnooze={() => onSnooze(task.id)}
                />
              ))}
            </View>
          ) : null}

          {waitCount > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>{t('home.waiting')}</Text>
              {waitingFromTasks.map((task) => (
                <TaskLoopRow
                  key={task.id}
                  task={task}
                  kindLabel={t('home.waiting')}
                  doneLabel={t('home.loopClosed')}
                  snoozeLabel={t('home.snooze')}
                  onDone={() => onDoneTaskLoop(task)}
                  onSnooze={() => onSnooze(task.id)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </HomeSection>
  )
}

function TaskLoopRow({
  task,
  kindLabel,
  doneLabel,
  snoozeLabel,
  onDone,
  onSnooze,
}: {
  task: Task
  kindLabel: string
  doneLabel: string
  snoozeLabel: string
  onDone: () => void
  onSnooze: () => void
}) {
  return (
    <View style={styles.item}>
      <Text style={styles.meta}>{kindLabel}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>
      {task.date || task.time ? (
        <Text style={styles.hint}>
          {[task.date, task.time].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={styles.addBtn} onPress={onDone}>
          <Text style={styles.addBtnText}>{doneLabel}</Text>
        </Pressable>
        <Pressable onPress={onSnooze} hitSlop={8}>
          <Text style={styles.dismiss}>{snoozeLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 12 },
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  summary: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  quiet: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  emptyBlock: { gap: 10 },
  tplRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tplChip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tplText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  composer: {
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  kindChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  kindText: { color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 13 },
  kindTextOn: { color: colors.accentStrong },
  composerHint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    backgroundColor: colors.bgElevated,
  },
  block: { gap: 0, marginTop: 4 },
  blockLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
    marginTop: 6,
  },
  item: {
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  meta: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 12 },
  title: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  hint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  addBtn: {
    backgroundColor: colors.bgDeep,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  dismiss: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
})
