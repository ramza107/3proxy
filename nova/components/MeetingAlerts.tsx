import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { fetchEmailMeetings, fetchEmailStatus } from '../lib/emailApi'
import { notifyMeetingEmail, registerDevicePushToken } from '../lib/notifications'
import { useNovaStore } from '../lib/store'
import type { MeetingAlert, MeetingsDigest } from '../types'

type Props = {
  userId: string | null
  /** Settings: fire push/local when new meet/report emails appear */
  alertsEnabled: boolean
}

const POLL_MS = 5 * 60 * 1000

/**
 * Recent Primary inbox → meet / call / report asks.
 * Fires a notification: “Aaz wrote — wants to meet Sep 23 at 6pm”.
 */
export function MeetingAlerts({ userId, alertsEnabled }: Props) {
  const router = useRouter()
  const notified = useNovaStore((s) => s.notifiedMeetingIds)
  const markMeetingNotified = useNovaStore((s) => s.markMeetingNotified)
  const dismissMeeting = useNovaStore((s) => s.dismissMeeting)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)
  const notificationsEnabled = useNovaStore((s) => s.settings.notificationsEnabled)

  const [data, setData] = useState<MeetingsDigest | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const notifying = useRef(false)

  const load = async (allowDemo = false) => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const status = await fetchEmailStatus(userId)
      setConnected(status.connected)
      if (!status.connected) {
        if (allowDemo) {
          setData(await fetchEmailMeetings(userId, { demo: true }))
        } else {
          setData(null)
        }
        return
      }
      setData(await fetchEmailMeetings(userId, { hours: 48 }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not scan inbox')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true).catch(() => undefined)
    }, [userId]),
  )

  // Register Expo push token so the server can alert while the app is closed
  useEffect(() => {
    if (!userId || !alertsEnabled || !notificationsEnabled) return
    if (Platform.OS === 'web') return
    registerDevicePushToken(userId).catch(() => undefined)
  }, [userId, alertsEnabled, notificationsEnabled])

  // Poll while Home is active
  useEffect(() => {
    if (!userId || !alertsEnabled) return
    const id = setInterval(() => {
      if (AppState.currentState === 'active') load(false).catch(() => undefined)
    }, POLL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, alertsEnabled])

  const visible = useMemo(() => {
    const list = data?.meetings || []
    // Still show items even after notify — only hide dismissed (same list as notified for dismiss)
    return list.filter((m) => !notified.includes(`dismiss:${m.id}`))
  }, [data?.meetings, notified])

  // Fire local/push-style notifications for brand-new alerts
  useEffect(() => {
    if (!alertsEnabled || !data?.meetings?.length || notifying.current) return
    const fresh = data.meetings.filter((m) => !notified.includes(m.id))
    if (!fresh.length) return
    notifying.current = true
    ;(async () => {
      for (const m of fresh) {
        if (Platform.OS === 'web') {
          // Web has no push — keep in-card only
          markMeetingNotified(m.id)
          continue
        }
        const ok = await notifyMeetingEmail({
          body: m.notifyBody,
          alertId: m.id,
          enabled: notificationsEnabled,
        })
        markMeetingNotified(m.id)
        if (!ok && notificationsEnabled) {
          // still mark so we don't spam retries
        }
      }
      notifying.current = false
    })().catch(() => {
      notifying.current = false
    })
  }, [alertsEnabled, data, notified, notificationsEnabled, markMeetingNotified])

  if (!userId) return null

  const onAddTask = (m: MeetingAlert) => {
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
    })
    dismissMeeting(`dismiss:${m.id}`)
    Alert.alert('Added to Tasks', title)
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.kicker}>Inbox asks</Text>
        {connected ? (
          <Pressable onPress={() => load(false)} hitSlop={8}>
            <Text style={styles.refresh}>{loading ? '…' : 'Scan'}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.tagline}>
        {alertsEnabled
          ? 'Watching Primary for meet / call / report — push when something new lands.'
          : 'Turn on Meeting alerts in Settings for push notifications.'}
      </Text>

      {loading && !data ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !connected && !data?.demo ? (
        <>
          <Text style={styles.summary}>
            When someone emails “let’s meet tomorrow at 6” or asks for a report, Wahrly can notify
            you and offer a task.
          </Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>Connect Gmail</Text>
          </Pressable>
          <Pressable onPress={() => load(true)}>
            <Text style={styles.demoLink}>Preview with demo alerts</Text>
          </Pressable>
        </>
      ) : visible.length === 0 ? (
        <Text style={styles.summary}>
          {data?.summary || 'No meeting or report asks in recent inbox.'}
        </Text>
      ) : (
        <>
          <Text style={styles.summary}>{data?.summary}</Text>
          {data?.demo ? <Text style={styles.demoNote}>Demo preview</Text> : null}
          <View style={styles.list}>
            {visible.map((m) => (
              <View key={m.id} style={styles.item}>
                <Text style={styles.from}>
                  {m.fromName}
                  {m.intent === 'meet'
                    ? ' · meet'
                    : m.intent === 'report'
                      ? ' · report'
                      : m.intent === 'call'
                        ? ' · call'
                        : ''}
                </Text>
                <Text style={styles.summaryLine} numberOfLines={2}>
                  {m.summary}
                </Text>
                <Text style={styles.subject} numberOfLines={1}>
                  {m.subject}
                </Text>
                <View style={styles.actions}>
                  <Pressable style={styles.addBtn} onPress={() => onAddTask(m)}>
                    <Text style={styles.addBtnText}>Add task</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      markMeetingNotified(m.id)
                      dismissMeeting(`dismiss:${m.id}`)
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.dismiss}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: {
    color: colors.bgDeep,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    flex: 1,
  },
  refresh: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  tagline: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: -4,
  },
  summary: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  summaryLine: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  demoNote: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  demoLink: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 4,
  },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13 },
  list: { gap: 12, marginTop: 4 },
  item: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  from: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 12 },
  subject: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  addBtn: {
    backgroundColor: colors.bgDeep,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  addBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  dismiss: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
})
