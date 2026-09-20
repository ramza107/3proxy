import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { fetchCalendarEvents, fetchEmailStatus } from '../lib/emailApi'
import { todayISO } from '../lib/store'
import type { CalendarEvent } from '../types'

type Props = {
  userId: string | null
  enabled?: boolean
  /** Called when today's events load (for DailyPlan merge) */
  onEvents?: (events: CalendarEvent[]) => void
}

function dayBounds(day: string) {
  // Local day as ISO range — server passes through to Google
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

/** Today’s Google Calendar on Home — readonly. */
export function CalendarBrief({ userId, enabled = true, onEvents }: Props) {
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

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.kicker}>Calendar</Text>
        {connected ? (
          <Pressable onPress={() => load()} hitSlop={8}>
            <Text style={styles.refresh}>{loading ? '…' : 'Refresh'}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading && events.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>Reconnect Google</Text>
          </Pressable>
        </>
      ) : !connected ? (
        <>
          <Text style={styles.summary}>
            Connect Google once — today&apos;s meetings land on your signal (readonly).
          </Text>
          {demo && events.length > 0 ? (
            <Text style={styles.demoNote}>Demo preview:</Text>
          ) : null}
          {demo
            ? events.slice(0, 3).map((ev) => (
                <View key={ev.id} style={styles.item}>
                  <Text style={styles.when}>{formatEventWhen(ev)}</Text>
                  <Text style={styles.title} numberOfLines={1}>
                    {ev.title}
                  </Text>
                </View>
              ))
            : null}
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>Connect with Google</Text>
          </Pressable>
        </>
      ) : events.length === 0 ? (
        <Text style={styles.summary}>No events on the primary calendar today.</Text>
      ) : (
        <View style={styles.list}>
          {events.slice(0, 6).map((ev) => (
            <View key={ev.id} style={styles.item}>
              <Text style={styles.when}>{formatEventWhen(ev)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {ev.title}
                </Text>
                {ev.location ? (
                  <Text style={styles.loc} numberOfLines={1}>
                    {ev.location}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {events.length > 6 ? (
            <Text style={styles.demoNote}>+{events.length - 6} more today</Text>
          ) : null}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 8, paddingVertical: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    flex: 1,
  },
  refresh: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  summary: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  demoNote: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13 },
  list: { gap: 8 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  when: {
    width: 72,
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingTop: 2,
  },
  title: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  loc: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 1 },
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
