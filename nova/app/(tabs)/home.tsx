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
import { FadeUp, Screen } from '../../components/Screen'
import { brand, colors, fonts, spacing } from '../../constants/theme'
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeUp>
            <View style={styles.hero}>
              <Text style={styles.brandMark}>{brand.name}</Text>
              <Text style={styles.hello}>{greeting()}</Text>
              <Text style={styles.lede}>
                Hi {name} — {format(new Date(), 'EEEE, MMMM d')}
              </Text>
            </View>
          </FadeUp>

          <FadeUp delay={80} style={styles.compose}>
            <Text style={styles.composeLabel}>Say it once</Text>
            <AIInput loading={loading} onSend={onSend} placeholder="Tomorrow buy milk at 7…" />
            <Pressable style={styles.askLink} onPress={() => router.push('/chat')}>
              <Text style={styles.askLinkText}>Open full chat →</Text>
            </Pressable>
          </FadeUp>

          <FadeUp delay={140}>
            <DailyPlan tasks={todayTasks} onToggle={(task) => toggleTaskCompleted(task)} />
          </FadeUp>

          <FadeUp delay={200} style={styles.signals}>
            <Text style={styles.signalsTitle}>From mail</Text>
            <Text style={styles.signalsSub}>Yesterday, asks, and promises you made</Text>
            <View style={styles.signalsStack}>
              <InboxBrief userId={userId} enabled={emailDigestEnabled} />
              <MeetingAlerts userId={userId} alertsEnabled={meetingEmailAlertsEnabled} />
              <PromisesBrief userId={userId} autoCreate={emailPromisesAutoEnabled} />
            </View>
          </FadeUp>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 48,
    gap: spacing.xl,
  },
  hero: { gap: 6, paddingTop: 4 },
  brandMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 42,
    letterSpacing: -1.4,
    lineHeight: 46,
  },
  hello: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.brandItalic,
    letterSpacing: -0.4,
  },
  lede: {
    color: colors.textMuted,
    fontSize: 15,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  compose: { gap: 10 },
  composeLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  askLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  askLinkText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  signals: { gap: 8 },
  signalsTitle: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  signalsSub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    marginBottom: 4,
  },
  signalsStack: { gap: spacing.md },
})
