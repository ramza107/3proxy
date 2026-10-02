import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { fetchEmailMeetings, fetchEmailPromises, fetchEmailStatus } from '../lib/emailApi'
import { canUseGmailAI } from '../lib/pro'
import { notifyMeetingEmail, registerDevicePushToken } from '../lib/notifications'
import { useNovaStore } from '../lib/store'
import { useT } from '../lib/useT'
import type { EmailPromise, MeetingAlert, MeetingsDigest, PromisesDigest, Task } from '../types'
import { HomeSection } from './HomeSection'

type Props = {
  userId: string | null
  autoPromises: boolean
  meetingAlertsEnabled: boolean
}

type LoopKind = 'promise' | 'meeting'

/**
 * First-class social loops: “I owe” vs “Waiting”.
 * Local tasks are the source of truth; Gmail (Pro) is optional intake.
 */
export function OpenLoopsBrief({ userId, autoPromises, meetingAlertsEnabled }: Props) {
  const t = useT()
  const router = useRouter()
  const dismissed = useNovaStore((s) => s.dismissedPromiseIds)
  const notified = useNovaStore((s) => s.notifiedMeetingIds)
  const snoozedLoops = useNovaStore((s) => s.snoozedLoops)
  const dismissPromise = useNovaStore((s) => s.dismissPromise)
  const dismissMeeting = useNovaStore((s) => s.dismissMeeting)
  const snoozeLoop = useNovaStore((s) => s.snoozeLoop)
  const markMeetingNotified = useNovaStore((s) => s.markMeetingNotified)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const upsertTask = useNovaStore((s) => s.upsertTask)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)
  const tasks = useNovaStore((s) => s.tasks)
  const notificationsEnabled = useNovaStore((s) => s.settings.notificationsEnabled)

  const [promises, setPromises] = useState<PromisesDigest | null>(null)
  const [meetings, setMeetings] = useState<MeetingsDigest | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [draftKind, setDraftKind] = useState<LoopKind>('promise')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftWho, setDraftWho] = useState('')
  const notifying = useRef(false)
  const autoRanFor = useRef<string | null>(null)

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

  const loadMail = async (allowDemo = false, refresh = false) => {
    if (!userId || !canUseGmailAI()) {
      setPromises(null)
      setMeetings(null)
      setConnected(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const status = await fetchEmailStatus(userId)
      setConnected(status.connected)
      if (!status.connected) {
        if (allowDemo) {
          setPromises(await fetchEmailPromises(userId, { demo: true, isPro: true }))
          setMeetings(await fetchEmailMeetings(userId, { demo: true, isPro: true }))
        } else {
          setPromises(null)
          setMeetings(null)
        }
        return
      }
      const p = await fetchEmailPromises(userId, { days: 7, refresh, isPro: true })
      setPromises(p)
      const m = await fetchEmailMeetings(userId, { hours: 48, refresh, isPro: true })
      setMeetings(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not scan mail')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadMail(false).catch(() => undefined)
    }, [userId]),
  )

  useEffect(() => {
    if (!userId || !meetingAlertsEnabled || !notificationsEnabled) return
    if (Platform.OS === 'web') return
    if (!canUseGmailAI()) return
    registerDevicePushToken(userId).catch(() => undefined)
  }, [userId, meetingAlertsEnabled, notificationsEnabled])

  useEffect(() => {
    if (!userId || !meetingAlertsEnabled || !canUseGmailAI()) return
    const id = setInterval(() => {
      if (AppState.currentState === 'active') {
        fetchEmailMeetings(userId, { hours: 48, isPro: true })
          .then((m) => setMeetings(m))
          .catch(() => undefined)
      }
    }, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [userId, meetingAlertsEnabled])

  useEffect(() => {
    if (!autoPromises) autoRanFor.current = null
  }, [autoPromises])

  useEffect(() => {
    if (!meetingAlertsEnabled || !meetings?.meetings?.length || notifying.current) return
    const fresh = meetings.meetings.filter((m) => !notified.includes(m.id))
    if (!fresh.length) return
    notifying.current = true
    ;(async () => {
      for (const m of fresh) {
        if (Platform.OS === 'web') {
          markMeetingNotified(m.id)
          continue
        }
        await notifyMeetingEmail({
          body: m.notifyBody,
          alertId: m.id,
          enabled: notificationsEnabled,
        })
        markMeetingNotified(m.id)
      }
      notifying.current = false
    })().catch(() => {
      notifying.current = false
    })
  }, [meetingAlertsEnabled, meetings, notified, notificationsEnabled, markMeetingNotified])

  const oweFromMail = useMemo(() => {
    const list = promises?.promises || []
    return list.filter((p) => {
      if (dismissed.includes(p.id)) return false
      if (isSnoozed(p.id)) return false
      const spawned = openTasks.some((task) => task.sourceKind === 'promise' && task.sourceId === p.id)
      return !spawned
    })
  }, [promises?.promises, dismissed, openTasks, snoozedLoops])

  const oweFromTasks = useMemo(
    () =>
      openTasks.filter((task) => task.sourceKind === 'promise' && !isSnoozed(task.id)),
    [openTasks, snoozedLoops],
  )

  const waitingFromMail = useMemo(() => {
    const list = meetings?.meetings || []
    return list.filter((m) => {
      if (notified.includes(`dismiss:${m.id}`)) return false
      if (isSnoozed(m.id)) return false
      const spawned = openTasks.some((task) => task.sourceKind === 'meeting' && task.sourceId === m.id)
      return !spawned
    })
  }, [meetings?.meetings, notified, openTasks, snoozedLoops])

  const waitingFromTasks = useMemo(
    () =>
      openTasks.filter((task) => task.sourceKind === 'meeting' && !isSnoozed(task.id)),
    [openTasks, snoozedLoops],
  )

  useEffect(() => {
    if (!autoPromises || !userId || !promises?.promises?.length) return
    const fingerprint = `${promises.generatedAt}:${promises.promises.map((p) => p.id).join(',')}`
    if (autoRanFor.current === fingerprint) return
    autoRanFor.current = fingerprint
    const uidUser = sessionUserId || userId
    if (!uidUser) return
    const state = useNovaStore.getState()
    const already = new Set(state.dismissedPromiseIds)
    const titles = new Set(
      state.tasks.filter((x) => !x.completed).map((x) => x.title.trim().toLowerCase()),
    )
    for (const p of promises.promises) {
      if (already.has(p.id)) continue
      if (state.isLoopSnoozed(p.id)) continue
      if (state.tasks.some((x) => !x.completed && x.sourceId === p.id)) {
        dismissPromise(p.id)
        continue
      }
      const key = p.suggestedTask.trim().toLowerCase()
      if (titles.has(key)) {
        dismissPromise(p.id)
        continue
      }
      createTaskLocal({
        title: p.suggestedTask,
        date: p.suggestedDate,
        priority: 'high',
        userId: uidUser,
        sourceKind: 'promise',
        sourceId: p.id,
      })
      dismissPromise(p.id)
      titles.add(key)
    }
  }, [autoPromises, userId, sessionUserId, promises, createTaskLocal, dismissPromise])

  if (!userId) return null

  const oweCount = oweFromMail.length + oweFromTasks.length
  const waitCount = waitingFromMail.length + waitingFromTasks.length
  const total = oweCount + waitCount
  const demo = !!(promises?.demo || meetings?.demo)
  const gmailPro = canUseGmailAI()

  const onAddPromise = (p: EmailPromise) => {
    const uidUser = sessionUserId || userId
    if (!uidUser) return
    createTaskLocal({
      title: p.suggestedTask,
      date: p.suggestedDate,
      priority: 'high',
      userId: uidUser,
      sourceKind: 'promise',
      sourceId: p.id,
    })
    dismissPromise(p.id)
  }

  const onAddMeeting = (m: MeetingAlert) => {
    const uidUser = sessionUserId || userId
    if (!uidUser) return
    const title =
      m.intent === 'meet'
        ? `Meet ${m.fromName}${m.suggestedTime ? ` at ${m.suggestedTime}` : ''}`
        : m.intent === 'report'
          ? `Send report to ${m.fromName}`
          : m.summary
    createTaskLocal({
      title,
      date: m.suggestedDate,
      time: m.suggestedTime,
      priority: 'high',
      userId: uidUser,
      sourceKind: 'meeting',
      sourceId: m.id,
    })
    dismissMeeting(`dismiss:${m.id}`)
  }

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

  return (
    <HomeSection
      title={t('home.openLoops')}
      meta={total ? t.tf('home.openCount', { n: total }) : t('home.clear')}
      action={
        <Pressable
          onPress={() => setAdding((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('home.addLoop')}
        >
          <Text style={styles.refresh}>{adding ? t('home.close') : t('home.addLoop')}</Text>
        </Pressable>
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
        <Text style={styles.quiet}>{t('home.loopsEmpty')}</Text>
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
              {oweFromMail.map((p) => (
                <View key={p.id} style={styles.item}>
                  <Text style={styles.meta}>{t.tf('home.to', { name: p.toName })}</Text>
                  <Text style={styles.title} numberOfLines={2}>
                    “{p.promise}”
                  </Text>
                  <Text style={styles.hint} numberOfLines={2}>
                    → {p.suggestedTask}
                    {p.suggestedDate ? ` · ${p.suggestedDate}` : ''}
                  </Text>
                  {!autoPromises ? (
                    <View style={styles.actions}>
                      <Pressable style={styles.addBtn} onPress={() => onAddPromise(p)}>
                        <Text style={styles.addBtnText}>{t('home.trackLoop')}</Text>
                      </Pressable>
                      <Pressable onPress={() => onSnooze(p.id)} hitSlop={8}>
                        <Text style={styles.dismiss}>{t('home.snooze')}</Text>
                      </Pressable>
                      <Pressable onPress={() => dismissPromise(p.id)} hitSlop={8}>
                        <Text style={styles.dismiss}>{t('home.dismiss')}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.autoPending}>{t('home.adding')}</Text>
                  )}
                </View>
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
              {waitingFromMail.map((m) => (
                <View key={m.id} style={styles.item}>
                  <Text style={styles.meta}>
                    {m.fromName}
                    {m.intent === 'meet'
                      ? ` · ${t('home.intentMeet')}`
                      : m.intent === 'report'
                        ? ` · ${t('home.intentReport')}`
                        : m.intent === 'call'
                          ? ` · ${t('home.intentCall')}`
                          : ''}
                  </Text>
                  <Text style={styles.title} numberOfLines={2}>
                    {m.summary}
                  </Text>
                  <Text style={styles.hint} numberOfLines={1}>
                    {m.subject}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable style={styles.addBtn} onPress={() => onAddMeeting(m)}>
                      <Text style={styles.addBtnText}>{t('home.trackLoop')}</Text>
                    </Pressable>
                    <Pressable onPress={() => onSnooze(m.id)} hitSlop={8}>
                      <Text style={styles.dismiss}>{t('home.snooze')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        markMeetingNotified(m.id)
                        dismissMeeting(`dismiss:${m.id}`)
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.dismiss}>{t('home.dismiss')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}

      {gmailPro ? (
        <View style={styles.mailFoot}>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {connected ? (
            <Pressable onPress={() => loadMail(false, true)} hitSlop={8}>
              <Text style={styles.demoLink}>
                {loading ? '…' : demo ? t('home.previewLoops') : t('home.scanMailLoops')}
              </Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.mailHint}>{t('home.loopsMailOptional')}</Text>
              <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
                <Text style={styles.demoLink}>{t('home.connectGoogle')}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
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
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  summary: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  quiet: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  demoLink: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 4,
  },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
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
  autoPending: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  mailFoot: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 4,
  },
  mailHint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
})
