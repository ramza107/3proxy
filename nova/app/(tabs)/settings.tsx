import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
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
import {
  ensureNotificationPermissions,
  parseHm,
  syncDailyRitualNotifications,
} from '../../lib/notifications'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { useNovaStore } from '../../lib/store'

const MORNING_PRESETS = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00']
const EVENING_PRESETS = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30']

export default function SettingsScreen() {
  const router = useRouter()
  const settings = useNovaStore((s) => s.settings)
  const tasks = useNovaStore((s) => s.tasks)
  const email = useNovaStore((s) => s.sessionEmail)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const clearSession = useNovaStore((s) => s.clearSession)
  const [name, setName] = useState(settings.name)
  const [morningTime, setMorningTime] = useState(settings.morningBriefTime || '08:00')
  const [eveningTime, setEveningTime] = useState(settings.eveningClearTime || '21:30')

  useEffect(() => {
    setMorningTime(settings.morningBriefTime || '08:00')
    setEveningTime(settings.eveningClearTime || '21:30')
  }, [settings.morningBriefTime, settings.eveningClearTime])

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
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Who wrote</Text>
                <Text style={styles.rowSub}>
                  On Home, type who emailed you — no Gmail setup.
                </Text>
              </View>
              <Switch
                value={settings.emailDigestEnabled !== false}
                onValueChange={(v) => updateSettings({ emailDigestEnabled: v })}
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
                <Text style={styles.rowSub}>Today&apos;s list + who-wrote reminder</Text>
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
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Evening Clear</Text>
                <Text style={styles.rowSub}>
                  Before sleep: create &amp; check tomorrow&apos;s list
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

          <Text style={styles.mode}>
            {isSupabaseConfigured ? 'Supabase connected' : 'Demo mode (local AsyncStorage)'}
            {Platform.OS === 'web' ? ' · Ritual times save now, push on mobile' : ''}
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
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
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
  mode: { color: colors.textDim, textAlign: 'center', fontSize: 12, fontFamily: fonts.body },
})
