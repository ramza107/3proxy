import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { colors, fonts, radii } from '../constants/theme'
import { fetchEmailPromises, fetchEmailStatus } from '../lib/emailApi'
import { useNovaStore } from '../lib/store'
import type { EmailPromise, PromisesDigest } from '../types'
import { HomeSection } from './HomeSection'
import { useT } from '../lib/useT'

type Props = {
  userId: string | null
  /** When true: scan Sent and auto-add undismissed promises as Tasks */
  autoCreate: boolean
}

/**
 * Open loops from YOUR sent mail — something Gmail never turns into tasks.
 * "I'll send the deck tomorrow" → Wahrly offers (or auto-adds) a real task.
 */
export function PromisesBrief({ userId, autoCreate }: Props) {
  const t = useT()
  const router = useRouter()
  const dismissed = useNovaStore((s) => s.dismissedPromiseIds)
  const dismissPromise = useNovaStore((s) => s.dismissPromise)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const sessionUserId = useNovaStore((s) => s.sessionUserId)

  const [data, setData] = useState<PromisesDigest | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoNote, setAutoNote] = useState('')
  const autoRanFor = useRef<string | null>(null)

  const load = async (allowDemo = false) => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      const status = await fetchEmailStatus(userId)
      setConnected(status.connected)
      if (!status.connected) {
        if (allowDemo) {
          setData(await fetchEmailPromises(userId, { demo: true }))
        } else {
          setData(null)
        }
        return
      }
      setData(await fetchEmailPromises(userId, { days: 7 }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not scan sent mail')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true).catch(() => undefined)
    }, [userId]),
  )

  // When user turns Auto-add ON, allow a fresh pass over current scan results
  useEffect(() => {
    if (!autoCreate) return
    autoRanFor.current = null
    setAutoNote('')
  }, [autoCreate])

  const visible = useMemo(() => {
    const list = data?.promises || []
    return list.filter((p) => !dismissed.includes(p.id))
  }, [data?.promises, dismissed])

  /** Auto-create tasks when the Settings checkbox is on */
  useEffect(() => {
    if (!autoCreate || !userId || !data?.promises?.length) return
    const fingerprint = `${data.generatedAt}:${data.promises.map((p) => p.id).join(',')}`
    if (autoRanFor.current === fingerprint) return
    // Lock before mutating store so re-renders from dismiss/create don't re-enter
    autoRanFor.current = fingerprint

    const uid = sessionUserId || userId
    if (!uid) return

    const state = useNovaStore.getState()
    const alreadyDismissed = new Set(state.dismissedPromiseIds)
    const titles = new Set(
      state.tasks.filter((t) => !t.completed).map((t) => t.title.trim().toLowerCase()),
    )
    let added = 0
    for (const p of data.promises) {
      if (alreadyDismissed.has(p.id)) continue
      const key = p.suggestedTask.trim().toLowerCase()
      if (titles.has(key)) {
        dismissPromise(p.id)
        alreadyDismissed.add(p.id)
        continue
      }
      createTaskLocal({
        title: p.suggestedTask,
        date: p.suggestedDate,
        priority: 'high',
        userId: uid,
      })
      dismissPromise(p.id)
      alreadyDismissed.add(p.id)
      titles.add(key)
      added += 1
    }
    if (added > 0) {
      setAutoNote(
        added === 1
          ? 'Added 1 promise as a task'
          : `Added ${added} promises as tasks`,
      )
    }
  }, [autoCreate, userId, sessionUserId, data, createTaskLocal, dismissPromise])

  if (!userId) return null

  const onAdd = (p: EmailPromise) => {
    const uid = sessionUserId || userId
    if (!uid) return
    createTaskLocal({
      title: p.suggestedTask,
      date: p.suggestedDate,
      priority: 'high',
      userId: uid,
    })
    dismissPromise(p.id)
    Alert.alert('Added to Tasks', p.suggestedTask)
  }

  return (
    <HomeSection
      title={t('home.promises')}
      meta={
        connected
          ? autoCreate
            ? 'Auto → Tasks'
            : visible.length
              ? `${visible.length} open`
              : 'Clear'
          : undefined
      }
      action={
        connected ? (
          <Pressable
            onPress={() => {
              autoRanFor.current = null
              load(false)
            }}
            hitSlop={8}
          >
            <Text style={styles.refresh}>{loading ? '…' : t('home.scan')}</Text>
          </Pressable>
        ) : null
      }
    >
      {autoNote ? <Text style={styles.autoNote}>{autoNote}</Text> : null}

      {loading && !data ? (
        <ActivityIndicator color={colors.accent} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !connected && !data?.demo ? (
        <>
          <Text style={styles.summary}>
            Commitments like “I’ll send…” in your sent mail become real tasks.
          </Text>
          <Pressable style={styles.btn} onPress={() => router.push('/settings')}>
            <Text style={styles.btnText}>{t('home.connectGoogle')}</Text>
          </Pressable>
          <Pressable onPress={() => load(true)}>
            <Text style={styles.demoLink}>Preview with demo promises</Text>
          </Pressable>
        </>
      ) : visible.length === 0 ? (
        <Text style={styles.quiet}>
          {autoNote
            ? 'Caught up — new promises land in Tasks automatically.'
            : data?.summary || 'No open promises — clear slate.'}
        </Text>
      ) : (
        <>
          {data?.demo ? <Text style={styles.demoNote}>Demo preview</Text> : null}
          <View style={styles.list}>
            {visible.map((p) => (
              <View key={p.id} style={styles.item}>
                <Text style={styles.to}>To {p.toName}</Text>
                <Text style={styles.promise} numberOfLines={2}>
                  “{p.promise}”
                </Text>
                <Text style={styles.taskHint} numberOfLines={2}>
                  → {p.suggestedTask}
                  {p.suggestedDate ? ` · ${p.suggestedDate}` : ''}
                </Text>
                {!autoCreate ? (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.addBtn}
                      onPress={() => onAdd(p)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.addBtnText}>Add task</Text>
                    </Pressable>
                    <Pressable onPress={() => dismissPromise(p.id)} hitSlop={8}>
                      <Text style={styles.dismiss}>Dismiss</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.autoPending}>Adding…</Text>
                )}
              </View>
            ))}
          </View>
        </>
      )}
    </HomeSection>
  )
}

const styles = StyleSheet.create({
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  autoNote: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  autoPending: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 4,
  },
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
  list: { gap: 0 },
  item: {
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  to: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 12 },
  promise: {
    color: colors.text,
    fontFamily: fonts.brandItalic,
    fontSize: 16,
    lineHeight: 22,
  },
  taskHint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
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
    marginTop: 2,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
})
