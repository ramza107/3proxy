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
import { addLocalDays, localISODate } from '../../lib/localDate'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import { sendNovaMessage } from '../../services/ai'
import type { AIAction } from '../../types'

type SavedItem = {
  title: string
  where: string
}

function describeWhere(action: AIAction): SavedItem | null {
  if (action.type === 'create_task') {
    const today = localISODate()
    const tomorrow = addLocalDays(today, 1)
    let where = 'Tasks → Upcoming'
    if (action.date === today) where = 'Tasks → Today'
    else if (action.date === tomorrow) where = 'Tasks → Tomorrow'
    else if (action.date) where = `Tasks → Upcoming`
    if (action.recurrence?.freq === 'daily') where += ' · repeats daily'
    else if (action.recurrence?.freq === 'weekly') where += ' · repeats weekly'
    return {
      title: action.title + (action.time ? ` · ${action.time}` : ''),
      where,
    }
  }
  if (action.type === 'create_reminder') {
    const today = localISODate()
    const tomorrow = addLocalDays(today, 1)
    let where = 'Tasks → Upcoming'
    if (action.date === today) where = 'Tasks → Today'
    else if (action.date === tomorrow) where = 'Tasks → Tomorrow'
    else if (action.date) where = `Tasks → Upcoming`
    return {
      title: action.title + (action.time ? ` · ${action.time}` : ''),
      where,
    }
  }
  if (action.type === 'create_bill') {
    return {
      title: `${action.title} · ${action.amount} ${action.currency || ''}`.trim(),
      where: 'Bills',
    }
  }
  if (action.type === 'mark_bill_paid') {
    return {
      title: action.title_hint || 'Bill paid',
      where: 'Bills',
    }
  }
  if (action.type === 'create_calendar_event') {
    const today = localISODate()
    const tomorrow = addLocalDays(today, 1)
    let where = 'Tasks (timed)'
    if (action.date === today) where = 'Tasks → Today'
    else if (action.date === tomorrow) where = 'Tasks → Tomorrow'
    return {
      title: `${action.title} · ${action.time}`,
      where: `${where} · Google optional`,
    }
  }
  if (action.type === 'complete_task') {
    return { title: 'Task completed', where: 'Tasks' }
  }
  if (action.type === 'delete_task') {
    return { title: 'Task removed', where: 'Tasks' }
  }
  return null
}

export default function ChatScreen() {
  const t = useT()
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
      Alert.alert(brand.name, e instanceof Error ? e.message : t('chat.unavailable'))
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
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{brand.name}</Text>
              <Text style={styles.sub}>{brand.tagline}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chat.done')}
              style={styles.doneBtn}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/tasks'))}
            >
              <Text style={styles.doneText}>{t('chat.done')}</Text>
            </Pressable>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t.tf('chat.emptyTitle', { name })}</Text>
              <Text style={styles.emptyText}>{t('chat.emptyText')}</Text>
              <Pressable
                style={styles.chip}
                onPress={() => onSend('Remind me to call Mom tomorrow at 7 PM')}
              >
                <Text style={styles.chipText}>{t('chat.chipRemind')}</Text>
              </Pressable>
              <Pressable
                style={styles.chip}
                onPress={() =>
                  onSend('I need to clean my apartment, buy food and do laundry tomorrow')
                }
              >
                <Text style={styles.chipText}>{t('chat.chipOrganize')}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => <ChatBubble role={item.role} content={item.content} />}
        />

        {saved.length > 0 && (
          <View style={styles.savedCard}>
            <Text style={styles.savedLabel}>{t('chat.saved')}</Text>
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
              <Text style={styles.savedBtnText}>{t('chat.openTasks')}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.inputWrap}>
          <AIInput
            loading={loading}
            placeholder={t('chat.placeholder')}
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 34, fontFamily: fonts.brand, letterSpacing: -0.8 },
  sub: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13, letterSpacing: 0.3 },
  doneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
  },
  doneText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 },
  empty: { gap: 12, paddingTop: 24 },
  emptyTitle: { color: colors.text, fontSize: 22, fontFamily: fonts.bodyBold },
  emptyText: { color: colors.textMuted, lineHeight: 22, marginBottom: 8, fontFamily: fonts.body },
  chip: {
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  chipText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium },
  savedCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.signal,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  savedLabel: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  savedItem: { color: colors.text, fontSize: 15, lineHeight: 22 },
  savedWhere: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  savedBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only
    cursor: 'pointer',
  },
  savedBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
  inputWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
})
