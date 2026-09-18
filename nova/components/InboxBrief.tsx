import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { fetchEmailDigest, fetchEmailStatus } from '../lib/emailApi'
import type { EmailDigest } from '../types'

type Props = {
  userId: string | null
  enabled: boolean
}

function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Automatic yesterday inbox digest from connected Gmail (device time zone). */
export function InboxBrief({ userId, enabled }: Props) {
  const router = useRouter()
  const [digest, setDigest] = useState<EmailDigest | null>(null)
  const [connected, setConnected] = useState(false)
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
        setDigest(null)
        return
      }
      const data = await fetchEmailDigest(userId, {
        demo: false,
        timeZone: deviceTimeZone(),
      })
      setDigest(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load inbox')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled])

  if (!enabled || !userId) return null

  const kicker = digest?.window?.dayLabel
    ? `Yesterday · ${digest.window.dayLabel}`
    : 'Yesterday’s inbox'

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.kicker}>{kicker}</Text>
        {connected ? (
          <Pressable onPress={() => load()} hitSlop={8}>
            <Text style={styles.refresh}>{loading ? '…' : 'Refresh'}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading && !digest ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !connected ? (
        <>
          <Text style={styles.summary}>
            Connect Gmail once — Google asks for permission, you tap Allow. Each morning Wahrly shows
            who wrote yesterday (your local time).
          </Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>Connect with Google</Text>
          </Pressable>
        </>
      ) : digest ? (
        <>
          <Text style={styles.summary}>{digest.summary}</Text>
          {digest.window?.timeZone ? (
            <Text style={styles.demoNote}>Times in {digest.window.timeZone}</Text>
          ) : null}
          {digest.highlights.length > 0 ? (
            <View style={styles.list}>
              {digest.highlights.slice(0, 5).map((h, i) => (
                <View key={`${h.fromName}-${h.subject}-${i}`} style={styles.senderRow}>
                  <Text style={styles.senderName}>
                    {h.fromName}
                    {h.time ? ` · ${h.time}` : ''}
                  </Text>
                  <Text style={styles.senderSub} numberOfLines={1}>
                    {h.subject}
                  </Text>
                </View>
              ))}
            </View>
          ) : digest.senders.length > 0 ? (
            <View style={styles.list}>
              {digest.senders.slice(0, 5).map((s) => (
                <View key={s.from} style={styles.senderRow}>
                  <Text style={styles.senderName}>{s.fromName}</Text>
                  <Text style={styles.senderSub} numberOfLines={1}>
                    {s.subjects[0]}
                    {s.count > 1 ? ` · ${s.count}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.demoNote}>Yesterday’s inbox looks quiet.</Text>
          )}
        </>
      ) : (
        <Text style={styles.summary}>Loading yesterday’s mail…</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
    paddingRight: 8,
  },
  refresh: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  summary: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  demoNote: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13 },
  list: { gap: 6, marginTop: 4 },
  senderRow: { gap: 2 },
  senderName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  senderSub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
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
