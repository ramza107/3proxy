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
import { Screen } from '../../components/Screen'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AIInput } from '../../components/AIInput'
import { ChatBubble } from '../../components/ChatBubble'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
import { useNovaStore } from '../../lib/store'
import { sendNovaMessage } from '../../services/ai'
import type { AIAction } from '../../types'

type SavedItem = {
  title: string
  where: string
}

function describeWhere(action: AIAction): SavedItem | null {
  if (action.type === 'create_task') {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    let where = 'Tasks → Upcoming'
    if (action.date === today) where = 'Tasks → Today'
    else if (action.date === tomorrow) where = 'Tasks → Tomorrow'
    else if (action.date) where = `Tasks → Upcoming`
    return {
      title: action.title + (action.time ? ` · ${action.time}` : ''),
      where,
    }
  }
  if (action.type === 'create_reminder') {
    return {
      title: action.title + (action.time ? ` · ${action.time}` : ''),
      where: 'Tasks → Tomorrow',
    }
  }
  return null
}

export default function ChatScreen() {
  const router = useRouter()
  const messages = useNovaStore((s) => s.messages)
  const name = useNovaStore((s) => s.settings.name) || 'there'
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<SavedItem[]>([])
  const listRef = useRef<FlatList>(null)

  const onSend = async (text: string) => {
    setLoading(true)
    try {
      const res = await sendNovaMessage(text)
      const items = (res.actions || [])
        .map(describeWhere)
        .filter((x): x is SavedItem => Boolean(x))
      setSaved(items)
    } catch (e) {
      Alert.alert('Wahrly', e instanceof Error ? e.message : 'AI unavailable')
    } finally {
      setLoading(false)
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    }
  }

  return (
    <Screen>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{brand.name}</Text>
          <Text style={styles.sub}>{brand.tagline}</Text>
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
                Tell me what you need to get done. I&apos;ll save it under the Tasks tab.
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

        {saved.length > 0 && (
          <View style={styles.savedCard}>
            <Text style={styles.savedLabel}>SAVED</Text>
            {saved.map((item, i) => (
              <Text key={`${item.title}-${i}`} style={styles.savedItem}>
                • {item.title}
              </Text>
            ))}
            <Text style={styles.savedWhere}>{saved[0]?.where}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.savedBtn}
              onPress={() => router.push('/tasks')}
            >
              <Text style={styles.savedBtnText}>Open Tasks</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.inputWrap}>
          <AIInput
            loading={loading}
            placeholder="Tomorrow I need to..."
            onSend={onSend}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: {
    color: colors.accentStrong,
    fontSize: 36,
    fontFamily: fonts.brand,
    letterSpacing: -1.1,
    lineHeight: 40,
  },
  sub: { color: colors.textMuted, fontFamily: fonts.brandItalic, fontSize: 15, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  empty: { gap: 12, paddingTop: 16 },
  emptyTitle: { color: colors.text, fontSize: 22, fontFamily: fonts.brand },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: fonts.body,
  },
  chip: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 14,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  chipText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 15 },
  savedCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.accent,
    paddingVertical: spacing.md,
    gap: 6,
  },
  savedLabel: {
    color: colors.accentStrong,
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.1,
  },
  savedItem: { color: colors.text, fontSize: 15, lineHeight: 22, fontFamily: fonts.body },
  savedWhere: { color: colors.textMuted, fontSize: 13, marginTop: 2, fontFamily: fonts.body },
  savedBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
  inputWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
})
