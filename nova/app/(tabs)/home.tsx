import { format } from 'date-fns'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AIInput } from '../../components/AIInput'
import { DailyPlan } from '../../components/DailyPlan'
import { InboxBrief } from '../../components/InboxBrief'
import { MeetingAlerts } from '../../components/MeetingAlerts'
import { PromisesBrief } from '../../components/PromisesBrief'
import { Screen } from '../../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { tasksForDay, todayISO, useNovaStore } from '../../lib/store'
import { refreshTasks, sendNovaMessage, toggleTaskCompleted } from '../../services/ai'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const router = useRouter()
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const tasks = useNovaStore((s) => s.tasks)
  const userId = useNovaStore((s) => s.sessionUserId)
  const emailDigestEnabled = useNovaStore((s) => s.settings.emailDigestEnabled !== false)
  const emailPromisesAutoEnabled = useNovaStore(
    (s) => s.settings.emailPromisesAutoEnabled === true,
  )
  const meetingEmailAlertsEnabled = useNovaStore(
    (s) => s.settings.meetingEmailAlertsEnabled !== false,
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userId) refreshTasks(userId).catch(() => undefined)
  }, [userId])

  const todayTasks = useMemo(() => tasksForDay(tasks, todayISO()), [tasks])

  const onSend = async (text: string) => {
    setLoading(true)
    try {
      await sendNovaMessage(text)
      router.push('/chat')
    } catch (e) {
      Alert.alert(brand.name, e instanceof Error ? e.message : 'Could not reach AI server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brandMark}>{brand.name}</Text>
          <Text style={styles.hello}>{greeting()}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          <Text style={styles.name}>Hi {name}</Text>

          <InboxBrief userId={userId} enabled={emailDigestEnabled} />

          <MeetingAlerts userId={userId} alertsEnabled={meetingEmailAlertsEnabled} />

          <PromisesBrief userId={userId} autoCreate={emailPromisesAutoEnabled} />

          <DailyPlan tasks={todayTasks} onToggle={(task) => toggleTaskCompleted(task)} />

          <Pressable style={styles.ask} onPress={() => router.push('/chat')}>
            <Text style={styles.askText}>Ask Wahrly</Text>
          </Pressable>

          <View style={styles.divider} />
          <Text style={styles.prompt}>What do you need to do?</Text>
          <AIInput
            loading={loading}
            onSend={onSend}
            onMicPress={() =>
              Alert.alert(
                'Voice ready soon',
                'Architecture is prepared. For MVP, type your request or paste a voice transcript.',
              )
            }
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  brandMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  hello: {
    color: colors.text,
    fontSize: 32,
    fontFamily: fonts.brand,
    letterSpacing: -0.6,
  },
  date: { color: colors.textMuted, fontSize: 15, fontFamily: fonts.body, marginTop: -6 },
  name: { color: colors.textDim, marginBottom: 4, fontFamily: fonts.body },
  ask: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 18,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  prompt: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.bodyMedium },
})
