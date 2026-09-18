import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { fetchEmailDigest } from '../lib/emailApi'
import type { EmailDigest } from '../types'

type Props = {
  userId: string | null
  enabled: boolean
  /** When not connected, still show a demo preview so the UI is understandable */
  allowDemoPreview?: boolean
}

export function InboxBrief({ userId, enabled, allowDemoPreview = true }: Props) {
  const [digest, setDigest] = useState<EmailDigest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!userId || !enabled) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchEmailDigest(userId, { demo: allowDemoPreview })
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
  }, [userId, enabled, allowDemoPreview])

  if (!enabled || !userId) return null

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.kicker}>Morning inbox</Text>
        <Pressable onPress={() => load()} hitSlop={8}>
          <Text style={styles.refresh}>{loading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {loading && !digest ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : digest ? (
        <>
          <Text style={styles.summary}>{digest.summary}</Text>
          {digest.demo ? (
            <Text style={styles.demoNote}>
              Demo preview — connect Gmail in Settings for your real mail.
            </Text>
          ) : null}
          {digest.senders.length > 0 ? (
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
          ) : null}
        </>
      ) : (
        <Text style={styles.summary}>Connect Gmail in Settings for a morning who-wrote brief.</Text>
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
  },
  refresh: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  summary: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  demoNote: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13 },
  list: { gap: 6, marginTop: 4 },
  senderRow: { gap: 2 },
  senderName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  senderSub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
})
