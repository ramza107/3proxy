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
import { copyText } from '../lib/clipboard'
import { draftForMeeting, draftForPromise } from '../lib/draftReply'
import { fetchEmailMeetings, fetchEmailPromises, fetchEmailStatus } from '../lib/emailApi'
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
  const dismissPromise = useNovaStore((s) => s.dismissPromise)
  const dismissMeeting = useNovaStore((s) => s.dismissMeeting)
  const markMeetingNotified = useNovaStore((s) => s.markMeetingNotified)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)
  const tasks = useNovaStore((s) => s.tasks)
  const notificationsEnabled = useNovaStore((s) => s.settings.notificationsEnabled)

  const [promises, setPromises] = useState<PromisesDigest | null>(null)
  const [meetings, setMeetings] = useState<MeetingsDigest | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const notifying = useRef(false)
  const autoRanFor = useRef<string | null>(null)

  const openTasks = useMemo(() => tasks.filter((x) => !x.completed), [tasks])

  const load = async (allowDemo = false) => {
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
      const [p, m] = await Promise.all([
        fetchEmailPromises(userId, { days: 7 }),
        fetchEmailMeetings(userId, { hours: 48 }),
      ])
      setPromises(p)
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
      if (AppState.currentState === 'active') load(false).catch(() => undefined)
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const spawned = openTasks.some((task) => task.sourceKind === 'promise' && task.sourceId === p.id)
      return !spawned
    })
  }, [promises?.promises, dismissed, openTasks])

  const oweFromTasks = useMemo(
    () => openTasks.filter((task) => task.sourceKind === 'promise'),
    [openTasks],
  )

  const waitingFromMail = useMemo(() => {
    const list = meetings?.meetings || []
    return list.filter((m) => {
      if (notified.includes(`dismiss:${m.id}`)) return false
      const spawned = openTasks.some((task) => task.sourceKind === 'meeting' && task.sourceId === m.id)
      return !spawned
    })
  }, [meetings?.meetings, notified, openTasks])

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

  const onDraftPromise = async (p: EmailPromise) => {
    try {
      const mode = await copyText(draftForPromise(p))
      Alert.alert(
        mode === 'copied' ? 'Draft copied' : 'Draft ready',
        mode === 'copied' ? 'Paste into Gmail when you follow up.' : 'Share sheet opened.',
      )
    } catch (e) {
      Alert.alert('Draft', e instanceof Error ? e.message : 'Could not copy')
    }
  }

  const onDraftMeeting = async (m: MeetingAlert) => {
    try {
      const mode = await copyText(draftForMeeting(m))
      Alert.alert(
        mode === 'copied' ? 'Draft copied' : 'Draft ready',
        mode === 'copied' ? 'Paste into Gmail when you reply.' : 'Share sheet opened.',
      )
    } catch (e) {
      Alert.alert('Draft', e instanceof Error ? e.message : 'Could not copy')
    }
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
          <Pressable onPress={() => load(false)} hitSlop={8}>
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
                <TaskLoopRow key={task.id} task={task} hint={t('home.inTasks')} />
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
                      <Pressable style={styles.draftBtn} onPress={() => onDraftPromise(p)}>
                        <Text style={styles.draftBtnText}>{t('home.draftReply')}</Text>
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
                <TaskLoopRow key={task.id} task={task} hint={t('home.inTasks')} />
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
                    <Pressable style={styles.draftBtn} onPress={() => onDraftMeeting(m)}>
                      <Text style={styles.draftBtnText}>{t('home.draftReply')}</Text>
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

function TaskLoopRow({ task, hint }: { task: Task; hint: string }) {
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
  draftBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  draftBtnText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
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
