import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { colors, fonts, radii } from '../constants/theme'
import { fetchCalendarEvents, fetchEmailStatus } from '../lib/emailApi'
import { todayISO } from '../lib/store'
import type { CalendarEvent } from '../types'
import { HomeSection } from './HomeSection'
import { useT } from '../lib/useT'

type Props = {
  userId: string | null
  enabled?: boolean
  /** Called when today's events load (for DailyPlan merge) */
  onEvents?: (events: CalendarEvent[]) => void
}

function dayBounds(day: string) {
  const start = new Date(`${day}T00:00:00`)
  const end = new Date(`${day}T23:59:59.999`)
  return { from: start.toISOString(), to: end.toISOString() }
}

function formatEventWhen(ev: CalendarEvent) {
  if (ev.allDay) return 'All day'
  try {
    const s = parseISO(ev.start)
    const e = parseISO(ev.end)
    return `${format(s, 'HH:mm')}–${format(e, 'HH:mm')}`
  } catch {
    return ev.start.slice(11, 16) || ''
  }
}

/** Today’s Google Calendar on Home — readonly; events also merge into Today rail. */
export function CalendarBrief({ userId, enabled = true, onEvents }: Props) {
  const t = useT()
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!userId || !enabled) return
    setLoading(true)
    setError('')
    try {
      const status = await fetchEmailStatus(userId)
      setConnected(status.connected)
      if (!status.connected) {
        const demoData = await fetchCalendarEvents(userId, { demo: true, ...dayBounds(todayISO()) })
        setEvents(demoData.events)
        setDemo(true)
        onEvents?.(demoData.events)
        return
      }
      const data = await fetchCalendarEvents(userId, dayBounds(todayISO()))
      setEvents(data.events)
      setDemo(data.demo)
      onEvents?.(data.events)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load calendar')
      onEvents?.([])
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined)
    }, [userId, enabled]),
  )

  if (!enabled || !userId) return null

  const meta =
    connected && events.length > 0
      ? `${events.length} today · on the rail above`
      : connected
        ? 'Primary calendar'
        : undefined

  return (
    <HomeSection
      title={t('home.calendar')}
      meta={meta}
      action={
        connected ? (
          <Pressable onPress={() => load()} hitSlop={8}>
            <Text style={styles.refresh}>{loading ? '…' : t('home.refresh')}</Text>
          </Pressable>
        ) : null
      }
    >
      {loading && events.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>{t('home.reconnectGoogle')}</Text>
          </Pressable>
        </>
      ) : !connected ? (
        <>
          <Text style={styles.summary}>
            Connect Google once — today’s meetings land on the Today rail (readonly).
          </Text>
          {demo && events.length > 0 ? (
            <View style={styles.list}>
              {events.slice(0, 3).map((ev) => (
                <View key={ev.id} style={styles.item}>
                  <Text style={styles.when}>{formatEventWhen(ev)}</Text>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {ev.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>{t('home.connectGoogle')}</Text>
          </Pressable>
        </>
      ) : events.length === 0 ? (
        <Text style={styles.quiet}>No events on the primary calendar today.</Text>
      ) : (
        <Text style={styles.quiet}>Meetings are on the Today signal above.</Text>
      )}
    </HomeSection>
  )
}

const styles = StyleSheet.create({
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  summary: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  quiet: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  list: { gap: 8 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  when: {
    width: 72,
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingTop: 2,
  },
  itemTitle: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
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
