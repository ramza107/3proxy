import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../../components/Screen'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { disconnectEmail, emailConnectUrl, fetchEmailStatus } from '../../lib/emailApi'
import {
  ensureNotificationPermissions,
  parseHm,
  syncDailyRitualNotifications,
} from '../../lib/notifications'
import { DOW_LABELS, normalizeTypicalWeek } from '../../lib/scheduleDay'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { useNovaStore } from '../../lib/store'
import { defaultTypicalWeek, type Dow, type WeekAnchor } from '../../types'

WebBrowser.maybeCompleteAuthSession()

const NATIVE_OAUTH_RETURN = 'wahrly://settings'

const MORNING_PRESETS = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00']
const EVENING_PRESETS = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30']
const WORK_START_PRESETS = ['08:00', '09:00', '10:00']
const WORK_END_PRESETS = ['17:00', '18:00', '19:00', '20:00']
const ANCHOR_PRESETS = [
  { title: 'Deep work', time: '09:30', durationMin: 90 },
  { title: 'Sport', time: '19:00', durationMin: 60 },
  { title: 'Family', time: '18:30', durationMin: 90 },
]

export default function SettingsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ gmail?: string }>()
  const settings = useNovaStore((s) => s.settings)
  const tasks = useNovaStore((s) => s.tasks)
  const email = useNovaStore((s) => s.sessionEmail)
  const userId = useNovaStore((s) => s.sessionUserId)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const setForceMorningBrief = useNovaStore((s) => s.setForceMorningBrief)
  const clearSession = useNovaStore((s) => s.clearSession)
  const [name, setName] = useState(settings.name)
  const [morningTime, setMorningTime] = useState(settings.morningBriefTime || '08:00')
  const [eveningTime, setEveningTime] = useState(settings.eveningClearTime || '21:30')
  const [workStart, setWorkStart] = useState(settings.workdayStart || '09:00')
  const [workEnd, setWorkEnd] = useState(settings.workdayEnd || '18:00')
  const [weekendStart, setWeekendStart] = useState(
    settings.typicalWeek?.weekendStart || '10:00',
  )
  const [weekendEnd, setWeekendEnd] = useState(settings.typicalWeek?.weekendEnd || '14:00')
  const [weekBlurb, setWeekBlurb] = useState(settings.typicalWeek?.blurb || '')
  const [oauthReady, setOauthReady] = useState(false)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)
  const [gmailBusy, setGmailBusy] = useState(false)

  const refreshGmail = useCallback(async () => {
    if (!userId) return
    try {
      const status = await fetchEmailStatus(userId)
      setOauthReady(status.configured)
      setGmailConnected(status.connected)
      setGmailEmail(status.email)
    } catch {
      setOauthReady(false)
      setGmailConnected(false)
      setGmailEmail(null)
    }
  }, [userId])

  useEffect(() => {
    setMorningTime(settings.morningBriefTime || '08:00')
    setEveningTime(settings.eveningClearTime || '21:30')
    setWorkStart(settings.workdayStart || '09:00')
    setWorkEnd(settings.workdayEnd || '18:00')
    const tw = normalizeTypicalWeek(settings.typicalWeek)
    setWeekendStart(tw.weekendStart)
    setWeekendEnd(tw.weekendEnd)
    setWeekBlurb(tw.blurb)
  }, [
    settings.morningBriefTime,
    settings.eveningClearTime,
    settings.workdayStart,
    settings.workdayEnd,
    settings.typicalWeek,
  ])

  const typicalWeek = normalizeTypicalWeek(settings.typicalWeek)

  const patchTypicalWeek = (patch: Partial<typeof typicalWeek>) => {
    updateSettings({
      typicalWeek: normalizeTypicalWeek({ ...typicalWeek, ...patch }),
    })
  }

  const toggleWorkDay = (dow: Dow) => {
    const next = [...typicalWeek.workDays] as typeof typicalWeek.workDays
    next[dow] = !next[dow]
    patchTypicalWeek({ workDays: next })
  }

  const addAnchor = (preset: (typeof ANCHOR_PRESETS)[0]) => {
    const id = `a_${Math.random().toString(36).slice(2, 8)}`
    const anchor: WeekAnchor = {
      id,
      title: preset.title,
      time: preset.time,
      durationMin: preset.durationMin,
      days: typicalWeek.workDays[2] ? [2, 4] : [1, 3], // Tue/Thu or Mon/Wed
    }
    patchTypicalWeek({ anchors: [...typicalWeek.anchors, anchor].slice(0, 6) })
  }

  const toggleAnchorDay = (anchorId: string, dow: Dow) => {
    patchTypicalWeek({
      anchors: typicalWeek.anchors.map((a) => {
        if (a.id !== anchorId) return a
        const has = a.days.includes(dow)
        return {
          ...a,
          days: has ? a.days.filter((d) => d !== dow) : [...a.days, dow].sort(),
        }
      }),
    })
  }

  const removeAnchor = (anchorId: string) => {
    patchTypicalWeek({ anchors: typicalWeek.anchors.filter((a) => a.id !== anchorId) })
  }

  useEffect(() => {
    syncDailyRitualNotifications(settings, tasks).catch(() => undefined)
  }, [
    settings.notificationsEnabled,
    settings.morningBriefEnabled,
    settings.morningBriefTime,
    settings.eveningClearEnabled,
    settings.eveningClearTime,
    settings.emailDigestEnabled,
    tasks,
  ])

  useEffect(() => {
    refreshGmail().catch(() => undefined)
  }, [refreshGmail])

  useEffect(() => {
    if (params.gmail === 'connected') {
      Alert.alert(
        'Gmail connected',
        'Morning inbox + Sent promises are ready. Turn on “Auto-add promises” to create tasks automatically.',
      )
      refreshGmail().catch(() => undefined)
      router.replace('/settings')
    } else if (params.gmail === 'error') {
      Alert.alert('Gmail', 'Could not connect. Try Connect with Google again.')
      router.replace('/settings')
    }
  }, [params.gmail, refreshGmail, router])

  const saveName = () => {
    updateSettings({ name: name.trim() || settings.name })
    Alert.alert('Saved', 'Your name was updated.')
  }

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await ensureNotificationPermissions()
      if (!granted && Platform.OS !== 'web') {
        Alert.alert('Permissions', 'Notifications are disabled on this device.')
        updateSettings({ notificationsEnabled: false })
        return
      }
      if (Platform.OS === 'web') {
        Alert.alert(
          'Saved for mobile',
          'Times are saved. Push reminders for Morning brief & Evening Clear work on iPhone/Android.',
        )
      }
    }
    updateSettings({ notificationsEnabled: value })
  }

  const applyMorningTime = (value: string) => {
    if (!parseHm(value)) {
      Alert.alert('Time', 'Use HH:MM, for example 08:00')
      return
    }
    setMorningTime(value)
    updateSettings({ morningBriefTime: value })
  }

  const applyEveningTime = (value: string) => {
    if (!parseHm(value)) {
      Alert.alert('Time', 'Use HH:MM, for example 21:30')
      return
    }
    setEveningTime(value)
    updateSettings({ eveningClearTime: value })
  }

  const applyWorkStart = (value: string) => {
    if (!parseHm(value)) {
      Alert.alert('Time', 'Use HH:MM, for example 09:00')
      return
    }
    setWorkStart(value)
    updateSettings({ workdayStart: value })
  }

  const applyWorkEnd = (value: string) => {
    if (!parseHm(value)) {
      Alert.alert('Time', 'Use HH:MM, for example 18:00')
      return
    }
    setWorkEnd(value)
    updateSettings({ workdayEnd: value })
  }

  const connectWithGoogle = async () => {
    if (!userId) {
      Alert.alert('Sign in', 'Sign in to Wahrly first, then connect Gmail.')
      return
    }
    if (!oauthReady) {
      Alert.alert(
        'Almost ready',
        'Google “Allow” login needs one-time product keys (GOOGLE_CLIENT_ID / SECRET) on the AI server. After that, every user just taps Allow — no passwords.',
      )
      return
    }
    const url = emailConnectUrl(userId)
    setGmailBusy(true)
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url
        return
      }
      // Opens in-app browser and returns to wahrly://settings after Google Allow
      const result = await WebBrowser.openAuthSessionAsync(url, NATIVE_OAUTH_RETURN)
      if (result.type === 'success' && result.url) {
        const q = result.url.includes('gmail=connected')
          ? 'connected'
          : result.url.includes('gmail=error')
            ? 'error'
            : null
        if (q === 'connected') {
          await refreshGmail()
          Alert.alert('Gmail connected', 'Wahrly can now read your inbox (readonly).')
          router.replace('/settings')
        } else if (q === 'error') {
          Alert.alert('Gmail', 'Could not connect. Try Connect with Google again.')
        }
      }
    } finally {
      setGmailBusy(false)
    }
  }

  const onDisconnectGmail = async () => {
    if (!userId) return
    setGmailBusy(true)
    try {
      await disconnectEmail(userId)
      setGmailConnected(false)
      setGmailEmail(null)
      Alert.alert('Disconnected', 'Gmail was removed from Wahrly.')
    } catch (e) {
      Alert.alert('Gmail', e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setGmailBusy(false)
    }
  }

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await getSupabase()?.auth.signOut()
    }
    clearSession()
    router.replace('/login')
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.sub}>{email || 'Local demo account'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor={colors.textDim}
            />
            <Pressable style={styles.btn} onPress={saveName}>
              <Text style={styles.btnText}>Save name</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.rowTitle}>Gmail</Text>
            <Text style={styles.rowSub}>
              Connect once. Google asks “Allow Wahrly to read mail?” — you tap Allow. Morning inbox
              shows who wrote yesterday; Inbox asks watch for meet/report emails; Promises scan
              Sent.
            </Text>

            {gmailConnected ? (
              <>
                <Text style={styles.connected}>Connected · {gmailEmail || 'Gmail'}</Text>
                <Pressable
                  style={[styles.btn, styles.btnGhost, gmailBusy && { opacity: 0.5 }]}
                  onPress={onDisconnectGmail}
                  disabled={gmailBusy}
                >
                  <Text style={styles.btnGhostText}>Disconnect</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.googleBtn, gmailBusy && { opacity: 0.5 }]}
                  onPress={connectWithGoogle}
                  disabled={gmailBusy}
                >
                  <Text style={styles.googleBtnText}>
                    {gmailBusy ? 'Opening Google…' : 'Connect with Google'}
                  </Text>
                </Pressable>
                <Text style={styles.hint}>
                  {oauthReady
                    ? 'Opens Google. Tap Allow — no password to copy.'
                    : 'Product setup: add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET on the AI server once. Then every user only taps Allow.'}
                </Text>
              </>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Show on Home</Text>
                <Text style={styles.rowSub}>Morning inbox card</Text>
              </View>
              <Switch
                value={settings.emailDigestEnabled !== false}
                onValueChange={(v) => updateSettings({ emailDigestEnabled: v })}
                trackColor={{ true: colors.accent, false: colors.bgSoft }}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Auto-add promises</Text>
                <Text style={styles.rowSub}>
                  Scan Sent for “I’ll…” commitments and create Tasks when you open Home
                </Text>
              </View>
              <Switch
                value={settings.emailPromisesAutoEnabled === true}
                onValueChange={(v) => updateSettings({ emailPromisesAutoEnabled: v })}
                trackColor={{ true: colors.accent, false: colors.bgSoft }}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Meeting email alerts</Text>
                <Text style={styles.rowSub}>
                  Watch Primary inbox for meet / call / report asks and push: “Name wrote — wants
                  to meet…”
                </Text>
              </View>
              <Switch
                value={settings.meetingEmailAlertsEnabled !== false}
                onValueChange={async (v) => {
                  updateSettings({ meetingEmailAlertsEnabled: v })
                  if (v) {
                    const { ensureNotificationPermissions, registerDevicePushToken } =
                      await import('../../lib/notifications')
                    await ensureNotificationPermissions()
                    if (userId) await registerDevicePushToken(userId)
                  }
                }}
                trackColor={{ true: colors.accent, false: colors.bgSoft }}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={styles.rowSub}>Task reminders + daily rituals</Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ true: colors.accent, false: colors.bgSoft }}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Morning brief</Text>
                <Text style={styles.rowSub}>
                  On open: today&apos;s tasks + weather, and a Plan day shortcut. Reminder at the
                  time below.
                </Text>
              </View>
              <Switch
                value={settings.morningBriefEnabled}
                onValueChange={(v) => updateSettings({ morningBriefEnabled: v })}
                trackColor={{ true: colors.accent, false: colors.bgSoft }}
              />
            </View>
            <Text style={styles.label}>Time</Text>
            <TextInput
              value={morningTime}
              onChangeText={setMorningTime}
              onEndEditing={() => applyMorningTime(morningTime)}
              placeholder="08:00"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <View style={styles.presets}>
              {MORNING_PRESETS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, morningTime === t && styles.chipOn]}
                  onPress={() => applyMorningTime(t)}
                >
                  <Text style={[styles.chipText, morningTime === t && styles.chipTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Weather city</Text>
            <TextInput
              value={settings.weatherCity || ''}
              onChangeText={(v) => updateSettings({ weatherCity: v })}
              placeholder="Kyiv"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoCapitalize="words"
            />
            <Text style={styles.rowSub}>
              Open-Meteo forecast for morning brief. Leave blank to try device location on web.
            </Text>
            <Pressable
              style={styles.openRitual}
              onPress={() => {
                updateSettings({ lastMorningBriefDate: null })
                setForceMorningBrief(true)
                router.push('/home')
              }}
            >
              <Text style={styles.openRitualText}>Show Morning brief now</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Evening Clear</Text>
                <Text style={styles.rowSub}>
                  In-app ritual: close today, shape tomorrow. Reminder at the time below.
                </Text>
              </View>
              <Switch
                value={settings.eveningClearEnabled}
                onValueChange={(v) => updateSettings({ eveningClearEnabled: v })}
                trackColor={{ true: colors.accent, false: colors.bgSoft }}
              />
            </View>
            <Text style={styles.label}>Time</Text>
            <TextInput
              value={eveningTime}
              onChangeText={setEveningTime}
              onEndEditing={() => applyEveningTime(eveningTime)}
              placeholder="21:30"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <View style={styles.presets}>
              {EVENING_PRESETS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, eveningTime === t && styles.chipOn]}
                  onPress={() => applyEveningTime(t)}
                >
                  <Text style={[styles.chipText, eveningTime === t && styles.chipTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.openRitual} onPress={() => router.push('/evening')}>
              <Text style={styles.openRitualText}>Open Evening Clear</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.rowTitle}>Workday</Text>
            <Text style={styles.rowSub}>
              Smart day packs tasks into free slots between these hours (Plan day / “разложи день”)
            </Text>
            <Text style={styles.label}>Start</Text>
            <TextInput
              value={workStart}
              onChangeText={setWorkStart}
              onEndEditing={() => applyWorkStart(workStart)}
              placeholder="09:00"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <View style={styles.presets}>
              {WORK_START_PRESETS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, workStart === t && styles.chipOn]}
                  onPress={() => applyWorkStart(t)}
                >
                  <Text style={[styles.chipText, workStart === t && styles.chipTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>End</Text>
            <TextInput
              value={workEnd}
              onChangeText={setWorkEnd}
              onEndEditing={() => applyWorkEnd(workEnd)}
              placeholder="18:00"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <View style={styles.presets}>
              {WORK_END_PRESETS.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, workEnd === t && styles.chipOn]}
                  onPress={() => applyWorkEnd(t)}
                >
                  <Text style={[styles.chipText, workEnd === t && styles.chipTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.rowTitle}>Typical week</Text>
            <Text style={styles.rowSub}>
              Which days are work days, light weekend hours, and recurring anchors Plan day will
              protect.
            </Text>
            <Text style={styles.label}>Work days</Text>
            <View style={styles.presets}>
              {DOW_LABELS.map(({ key, short }) => (
                <Pressable
                  key={key}
                  style={[styles.chip, typicalWeek.workDays[key] && styles.chipOn]}
                  onPress={() => toggleWorkDay(key)}
                >
                  <Text
                    style={[styles.chipText, typicalWeek.workDays[key] && styles.chipTextOn]}
                  >
                    {short}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Light days (hours)</Text>
            <View style={styles.presets}>
              {['10:00', '11:00'].map((t) => (
                <Pressable
                  key={`ws-${t}`}
                  style={[styles.chip, weekendStart === t && styles.chipOn]}
                  onPress={() => {
                    setWeekendStart(t)
                    patchTypicalWeek({ weekendStart: t })
                  }}
                >
                  <Text style={[styles.chipText, weekendStart === t && styles.chipTextOn]}>
                    {t} start
                  </Text>
                </Pressable>
              ))}
              {['13:00', '14:00', '16:00'].map((t) => (
                <Pressable
                  key={`we-${t}`}
                  style={[styles.chip, weekendEnd === t && styles.chipOn]}
                  onPress={() => {
                    setWeekendEnd(t)
                    patchTypicalWeek({ weekendEnd: t })
                  }}
                >
                  <Text style={[styles.chipText, weekendEnd === t && styles.chipTextOn]}>
                    {t} end
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Anchors</Text>
            <View style={styles.presets}>
              {ANCHOR_PRESETS.map((p) => (
                <Pressable key={p.title} style={styles.chip} onPress={() => addAnchor(p)}>
                  <Text style={styles.chipText}>+ {p.title}</Text>
                </Pressable>
              ))}
            </View>
            {typicalWeek.anchors.map((a) => (
              <View key={a.id} style={styles.anchorBlock}>
                <View style={styles.row}>
                  <Text style={styles.anchorTitle}>
                    {a.title} · {a.time} · {a.durationMin}m
                  </Text>
                  <Pressable onPress={() => removeAnchor(a.id)} hitSlop={8}>
                    <Text style={styles.dismiss}>Remove</Text>
                  </Pressable>
                </View>
                <View style={styles.presets}>
                  {DOW_LABELS.map(({ key, short }) => (
                    <Pressable
                      key={`${a.id}-${key}`}
                      style={[styles.chip, a.days.includes(key) && styles.chipOn]}
                      onPress={() => toggleAnchorDay(a.id, key)}
                    >
                      <Text
                        style={[styles.chipText, a.days.includes(key) && styles.chipTextOn]}
                      >
                        {short}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              value={weekBlurb}
              onChangeText={setWeekBlurb}
              onEndEditing={() => patchTypicalWeek({ blurb: weekBlurb.trim() })}
              placeholder="e.g. Gym Tue/Thu evenings, Friday light"
              placeholderTextColor={colors.textDim}
              style={[styles.input, { minHeight: 64 }]}
              multiline
            />
            <Pressable
              onPress={() => patchTypicalWeek(defaultTypicalWeek())}
              style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
            >
              <Text style={styles.dismiss}>Reset typical week</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>AI preferences</Text>
            {(['friendly', 'concise', 'coach'] as const).map((tone) => (
              <Pressable
                key={tone}
                style={[styles.tone, settings.aiTone === tone && styles.toneOn]}
                onPress={() => updateSettings({ aiTone: tone })}
              >
                <Text style={styles.toneText}>{tone}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.signOut} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/privacy')} style={styles.privacyLink}>
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </Pressable>

          <Text style={styles.mode}>
            {isSupabaseConfigured ? 'Supabase connected' : 'Demo mode (local AsyncStorage)'}
            {oauthReady ? ' · Google OAuth ready' : ' · Google OAuth keys pending'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  header: { gap: 4, marginBottom: 4 },
  title: { color: colors.text, fontSize: 30, fontFamily: fonts.brand, letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontFamily: fonts.body },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
  btnGhostText: { color: colors.text, fontFamily: fonts.bodyBold },
  googleBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 18,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  connected: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 14 },
  hint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  rowSub: { color: colors.textMuted, marginTop: 2, fontFamily: fonts.body, lineHeight: 18 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextOn: { color: colors.accentStrong },
  openRitual: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  openRitualText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 13 },
  anchorBlock: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  anchorTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14, flex: 1 },
  dismiss: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
  tone: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  toneOn: { borderWidth: 1, borderColor: colors.accent },
  toneText: {
    color: colors.text,
    textTransform: 'capitalize',
    fontFamily: fonts.bodyMedium,
  },
  signOut: {
    marginTop: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.danger,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: colors.danger, fontFamily: fonts.bodyBold },
  privacyLink: { alignItems: 'center', paddingVertical: 8 },
  privacyText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  mode: { color: colors.textDim, textAlign: 'center', fontSize: 12, fontFamily: fonts.body },
})
