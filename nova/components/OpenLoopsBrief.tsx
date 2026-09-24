import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { colors, fonts, radii } from '../constants/theme'
import { fetchEmailMeetings, fetchEmailPromises, fetchEmailStatus } from '../lib/emailApi'
import { draftForMeeting, draftForPromise } from '../lib/draftReply'
import { confirmSendReply, copyDraftAsDemo, copyDraftOnly, sendGmailOnly } from '../lib/sendReply'
import { notifyUser } from '../lib/notify'
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

/**
 * Open loops: “I owe” (sent promises) + “Waiting” (inbox asks).
 * Adding a task keeps the loop until that task is completed.
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
      {
        text: t('home.snooze1d'),
        onPress: () => snoozeLoop(id, snoozeUntilDays(1)),
      },
      {
        text: t('home.snooze3d'),
        onPress: () => snoozeLoop(id, snoozeUntilDays(3)),
      },
      {
        text: t('home.snoozeWeek'),
        onPress: () => snoozeLoop(id, snoozeUntilDays(7)),
      },
    ])
  }

  const [promises, setPromises] = useState<PromisesDigest | null>(null)
  const [meetings, setMeetings] = useState<MeetingsDigest | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const notifying = useRef(false)
  const autoRanFor = useRef<string | null>(null)

  const openTasks = useMemo(() => tasks.filter((x) => !x.completed), [tasks])

  const load = async (allowDemo = false, refresh = false) => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const status = await fetchEmailStatus(userId)
      setConnected(status.connected)
      if (!status.connected) {
        if (allowDemo) {
          setPromises(await fetchEmailPromises(userId, { demo: true }))
          setMeetings(await fetchEmailMeetings(userId, { demo: true }))
        } else {
          setPromises(null)
          setMeetings(null)
        }
        return
      }
      // Sequential — parallel promises+meetings + Yesterday digest blew Gmail quota.
      const p = await fetchEmailPromises(userId, { days: 7, refresh })
      setPromises(p)
      const m = await fetchEmailMeetings(userId, { hours: 48, refresh })
      setMeetings(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not scan mail')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true).catch(() => undefined)
    }, [userId]),
  )

  useEffect(() => {
    if (!userId || !meetingAlertsEnabled || !notificationsEnabled) return
    if (Platform.OS === 'web') return
    registerDevicePushToken(userId).catch(() => undefined)
  }, [userId, meetingAlertsEnabled, notificationsEnabled])

  useEffect(() => {
    if (!userId || !meetingAlertsEnabled) return
    const id = setInterval(() => {
      // Meetings-only soft refresh (server cache absorbs most calls).
      if (AppState.currentState === 'active') {
        fetchEmailMeetings(userId, { hours: 48 })
          .then((m) => setMeetings(m))
          .catch(() => undefined)
      }
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [userId, meetingAlertsEnabled])

  useEffect(() => {
    if (!autoPromises) {
      autoRanFor.current = null
    }
  }, [autoPromises])

  // Meeting push for fresh items
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
    () => openTasks.filter((task) => task.sourceKind === 'promise'),
    [openTasks],
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
    () => openTasks.filter((task) => task.sourceKind === 'meeting'),
    [openTasks],
  )

  // Auto-add promises when enabled
  useEffect(() => {
    if (!autoPromises || !userId || !promises?.promises?.length) return
    const fingerprint = `${promises.generatedAt}:${promises.promises.map((p) => p.id).join(',')}`
    if (autoRanFor.current === fingerprint) return
    autoRanFor.current = fingerprint
    const uid = sessionUserId || userId
    if (!uid) return
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
        userId: uid,
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

  const onAddPromise = (p: EmailPromise) => {
    const uid = sessionUserId || userId
    if (!uid) return
    createTaskLocal({
      title: p.suggestedTask,
      date: p.suggestedDate,
      priority: 'high',
      userId: uid,
      sourceKind: 'promise',
      sourceId: p.id,
    })
    dismissPromise(p.id)
    Alert.alert('On your list', 'Tracked under I owe until you complete it.')
  }

  const onAddMeeting = (m: MeetingAlert) => {
    const uid = sessionUserId || userId
    if (!uid) return
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
      userId: uid,
      sourceKind: 'meeting',
      sourceId: m.id,
    })
    dismissMeeting(`dismiss:${m.id}`)
    Alert.alert('On your list', 'Tracked under Waiting until you complete it.')
  }

  const onCopyPromise = async (p: EmailPromise) => {
    try {
      const body = draftForPromise(p)
      if (demo || !connected) {
        await copyDraftAsDemo(body)
      } else {
        await copyDraftOnly(body)
      }
    } catch (e) {
      notifyUser('Copy', e instanceof Error ? e.message : 'Could not copy')
    }
  }

  const onCopyMeeting = async (m: MeetingAlert) => {
    try {
      const body = draftForMeeting(m)
      if (demo || !connected) {
        await copyDraftAsDemo(body)
      } else {
        await copyDraftOnly(body)
      }
    } catch (e) {
      notifyUser('Copy', e instanceof Error ? e.message : 'Could not copy')
    }
  }

  const completeLinkedTasks = (sourceId: string) => {
    const now = new Date().toISOString()
    let n = 0
    for (const task of useNovaStore.getState().tasks) {
      if (task.completed || task.sourceId !== sourceId) continue
      upsertTask({ ...task, completed: true, updated_at: now })
      n += 1
    }
    return n
  }

  const onSendPromise = (p: EmailPromise) => {
    const body = draftForPromise(p)
    if (demo || !connected || !userId || !p.toEmail) {
      void copyDraftAsDemo(body).catch((e) => {
        notifyUser('Send', e instanceof Error ? e.message : 'Could not copy draft')
      })
      return
    }
    void (async () => {
      const ok = await confirmSendReply({ to: p.toEmail })
      if (!ok) return
      const result = await sendGmailOnly({
        userId,
        to: p.toEmail,
        subject: p.subject,
        body,
        threadId: p.messageId,
      })
      if (result !== 'sent') return
      completeLinkedTasks(p.id)
      dismissPromise(p.id)
    })()
  }

  const onSendMeeting = (m: MeetingAlert) => {
    const body = draftForMeeting(m)
    if (demo || !connected || !userId || !m.fromEmail) {
      void copyDraftAsDemo(body).catch((e) => {
        notifyUser('Send', e instanceof Error ? e.message : 'Could not copy draft')
      })
      return
    }
    void (async () => {
      const ok = await confirmSendReply({ to: m.fromEmail })
      if (!ok) return
      const result = await sendGmailOnly({
        userId,
        to: m.fromEmail,
        subject: m.subject,
        body,
        threadId: m.messageId,
      })
      if (result !== 'sent') return
      completeLinkedTasks(m.id)
      dismissMeeting(`dismiss:${m.id}`)
    })()
  }

  const onSendTaskLoop = (task: Task) => {
    if (task.sourceKind === 'promise') {
      const p = (promises?.promises || []).find((x) => x.id === task.sourceId)
      if (p) {
        onSendPromise(p)
        return
      }
    }
    if (task.sourceKind === 'meeting') {
      const m = (meetings?.meetings || []).find((x) => x.id === task.sourceId)
      if (m) {
        onSendMeeting(m)
        return
      }
    }
    // No digest row left — just mark the loop done.
    upsertTask({ ...task, completed: true, updated_at: new Date().toISOString() })
    Alert.alert(t('home.loopClosed'), t('home.loopClosedBody'))
  }

  return (
    <HomeSection
      title={t('home.openLoops')}
      meta={
        connected
          ? total
            ? t.tf('home.openCount', { n: total })
            : t('home.clear')
          : undefined
      }
      action={
        connected ? (
          <Pressable onPress={() => load(false, true)} hitSlop={8}>
            <Text style={styles.refresh}>{loading ? '…' : t('home.scan')}</Text>
          </Pressable>
        ) : null
      }
    >
      {loading && !promises && !meetings ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !connected && !demo ? (
        <>
          <Text style={styles.summary}>{t('home.loopsConnect')}</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>{t('home.connectGoogle')}</Text>
          </Pressable>
          <Pressable onPress={() => load(true)}>
            <Text style={styles.demoLink}>{t('home.previewLoops')}</Text>
          </Pressable>
        </>
      ) : total === 0 ? (
        <Text style={styles.quiet}>{t('home.loopsEmpty')}</Text>
      ) : (
        <>
          {demo ? <Text style={styles.demoNote}>{t('home.demoPreview')}</Text> : null}

          {oweCount > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>{t('home.iOwe')}</Text>
              {oweFromTasks.map((task) => (
                <TaskLoopRow
                  key={task.id}
                  task={task}
                  hint={t('home.inTasks')}
                  sendLabel={t('home.sendReply')}
                  onSend={() => onSendTaskLoop(task)}
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
                        <Text style={styles.addBtnText}>{t('home.addTask')}</Text>
                      </Pressable>
                      <Pressable style={styles.copyBtn} onPress={() => onCopyPromise(p)}>
                        <Text style={styles.copyBtnText}>{t('home.draftReply')}</Text>
                      </Pressable>
                      <Pressable style={styles.sendBtn} onPress={() => onSendPromise(p)}>
                        <Text style={styles.sendBtnText}>{t('home.sendReply')}</Text>
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
                  hint={t('home.inTasks')}
                  sendLabel={t('home.sendReply')}
                  onSend={() => onSendTaskLoop(task)}
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
                      <Text style={styles.addBtnText}>{t('home.addTask')}</Text>
                    </Pressable>
                    <Pressable style={styles.copyBtn} onPress={() => onCopyMeeting(m)}>
                      <Text style={styles.copyBtnText}>{t('home.draftReply')}</Text>
                    </Pressable>
                    <Pressable style={styles.sendBtn} onPress={() => onSendMeeting(m)}>
                      <Text style={styles.sendBtnText}>{t('home.sendReply')}</Text>
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
    </HomeSection>
  )
}

function TaskLoopRow({
  task,
  hint,
  sendLabel,
  onSend,
}: {
  task: Task
  hint: string
  sendLabel: string
  onSend: () => void
}) {
  return (
    <View style={styles.item}>
      <Text style={styles.title} numberOfLines={2}>
        {task.title}
      </Text>
      <Text style={styles.hint}>
        {hint}
        {task.date ? ` · ${task.date}` : ''}
        {task.time ? ` · ${task.time}` : ''}
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.sendBtn} onPress={onSend}>
          <Text style={styles.sendBtnText}>{sendLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  summary: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  quiet: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  demoNote: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  demoLink: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 4,
  },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
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
  addBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  copyBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  copyBtnText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  sendBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  sendBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  dismiss: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
  autoPending: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
})
