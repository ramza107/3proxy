import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AIInput } from '../../components/AIInput'
import { ChatBubble } from '../../components/ChatBubble'
import { colors, spacing } from '../../constants/theme'
import { useNovaStore } from '../../lib/store'
import { sendNovaMessage } from '../../services/ai'

export default function ChatScreen() {
  const router = useRouter()
  const messages = useNovaStore((s) => s.messages)
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const [loading, setLoading] = useState(false)
  const listRef = useRef<FlatList>(null)

  const onSend = async (text: string) => {
    setLoading(true)
    try {
      const res = await sendNovaMessage(text)
      if (res.actions?.some((a) => a.type === 'create_task' || a.type === 'create_reminder')) {
        // soft nudge toward plan
      }
    } catch (e) {
      Alert.alert('NOVA', e instanceof Error ? e.message : 'AI unavailable')
    } finally {
      setLoading(false)
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <Text style={styles.title}>NOVA</Text>
          <Text style={styles.sub}>Your personal assistant</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Hi {name}</Text>
              <Text style={styles.emptyText}>
                Tell me what you need to get done. I&apos;ll turn it into tasks and reminders.
              </Text>
              <Pressable
                style={styles.chip}
                onPress={() => onSend('Remind me to call Mom tomorrow at 7 PM')}
              >
                <Text style={styles.chipText}>Remind me to call Mom tomorrow at 7</Text>
              </Pressable>
              <Pressable
                style={styles.chip}
                onPress={() =>
                  onSend('I need to clean my apartment, buy food and do laundry tomorrow')
                }
              >
                <Text style={styles.chipText}>Organize 3 tasks for tomorrow</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <ChatBubble role={item.role} content={item.content} />}
        />

        {messages.some((m) => m.role === 'assistant') && (
          <Pressable style={styles.viewPlan} onPress={() => router.push('/tasks')}>
            <Text style={styles.viewPlanText}>View plan</Text>
          </Pressable>
        )}

        <View style={styles.inputWrap}>
          <AIInput
            loading={loading}
            placeholder="Tomorrow I need to..."
            onSend={onSend}
            onMicPress={() =>
              Alert.alert(
                'Voice',
                'Mic architecture is ready. Paste a transcript for now, or connect a speech-to-text provider next.',
              )
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textMuted },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  empty: { gap: 12, paddingTop: 24 },
  emptyTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
  emptyText: { color: colors.textMuted, lineHeight: 22, marginBottom: 8 },
  chip: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.accentStrong },
  viewPlan: { alignSelf: 'center', marginBottom: 8 },
  viewPlanText: { color: colors.accentStrong, fontWeight: '700' },
  inputWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
})
