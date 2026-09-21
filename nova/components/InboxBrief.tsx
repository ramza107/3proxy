import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { colors, fonts, radii } from '../constants/theme'
import { fetchEmailDigest, fetchEmailStatus } from '../lib/emailApi'
import type { EmailDigest } from '../types'
import { HomeSection } from './HomeSection'
import { useT } from '../lib/useT'

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
  const t = useT()
  const router = useRouter()
  const [digest, setDigest] = useState<EmailDigest | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async (refresh = false) => {
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
        refresh,
      })
      setDigest(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load inbox')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(false).catch(() => undefined)
    }, [userId, enabled]),
  )

  if (!enabled || !userId) return null

  const title = digest?.window?.dayLabel
    ? `${t('home.yesterday')} · ${digest.window.dayLabel}`
    : t('home.yesterday')
  const highlightCount = digest?.highlights?.length || digest?.senders?.length || 0
  const meta = connected
    ? highlightCount
      ? t.tf('home.fromInbox', { n: highlightCount })
      : digest
        ? t('home.quiet')
        : undefined
    : undefined

  return (
    <HomeSection
      title={title}
      meta={meta}
      action={
        connected ? (
          <Pressable onPress={() => load(true)} hitSlop={8}>
            <Text style={styles.refresh}>{loading ? '…' : t('home.refresh')}</Text>
          </Pressable>
        ) : null
      }
    >
      {loading && !digest ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !connected ? (
        <>
          <Text style={styles.summary}>{t('home.yesterdayConnect')}</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>{t('home.connectGoogle')}</Text>
          </Pressable>
        </>
      ) : digest ? (
        <>
          <Text style={styles.summary}>{digest.summary}</Text>
          {digest.highlights.length > 0 ? (
            <View style={styles.list}>
              {digest.highlights.slice(0, 4).map((h, i) => (
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
              {digest.senders.slice(0, 4).map((s) => (
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
            <Text style={styles.quiet}>{t('home.yesterdayQuiet')}</Text>
          )}
        </>
      ) : (
        <Text style={styles.quiet}>{t('home.yesterdayLoading')}</Text>
      )}
    </HomeSection>
  )
}

const styles = StyleSheet.create({
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  summary: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  quiet: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  list: { gap: 8, marginTop: 2 },
  senderRow: {
    gap: 2,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
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
    marginTop: 2,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
})
