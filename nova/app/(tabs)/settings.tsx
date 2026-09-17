import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radii, spacing } from '../../constants/theme'
import { ensureNotificationPermissions } from '../../lib/notifications'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { useNovaStore } from '../../lib/store'

export default function SettingsScreen() {
  const router = useRouter()
  const settings = useNovaStore((s) => s.settings)
  const email = useNovaStore((s) => s.sessionEmail)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const clearSession = useNovaStore((s) => s.clearSession)
  const [name, setName] = useState(settings.name)

  const saveName = () => {
    updateSettings({ name: name.trim() || settings.name })
    Alert.alert('Saved', 'Your name was updated.')
  }

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await ensureNotificationPermissions()
      if (!granted) {
        Alert.alert('Permissions', 'Notifications are disabled on this device.')
        updateSettings({ notificationsEnabled: false })
        return
      }
    }
    updateSettings({ notificationsEnabled: value })
  }

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await getSupabase()?.auth.signOut()
    }
    clearSession()
    router.replace('/(auth)/login')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            <Text style={styles.rowTitle}>Notifications</Text>
            <Text style={styles.rowSub}>Reminders for timed tasks</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ true: colors.accent, false: colors.bgSoft }}
          />
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
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md },
  header: { gap: 4, marginBottom: 4 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textMuted },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  label: { color: colors.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
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
  btnText: { color: '#0B0D12', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  rowSub: { color: colors.textMuted, marginTop: 2 },
  tone: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  toneOn: { borderWidth: 1, borderColor: colors.accent },
  toneText: { color: colors.text, textTransform: 'capitalize', fontWeight: '600' },
  signOut: {
    marginTop: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.danger,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: colors.danger, fontWeight: '800' },
  mode: { color: colors.textDim, textAlign: 'center', fontSize: 12 },
})
