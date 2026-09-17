import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, radii, spacing } from '../constants/theme'

type Props = {
  placeholder?: string
  loading?: boolean
  onSend: (text: string) => void | Promise<void>
  onMicPress?: () => void
}

export function AIInput({
  placeholder = 'What do you need to do?',
  loading,
  onSend,
  onMicPress,
}: Props) {
  const [text, setText] = useState('')

  const submit = async () => {
    const value = text.trim()
    if (!value || loading) return
    setText('')
    await onSend(value)
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        style={styles.input}
        multiline
        editable={!loading}
        onSubmitEditing={submit}
      />
      <View style={styles.actions}>
        <Pressable onPress={onMicPress} style={styles.mic} hitSlop={8}>
          <Text style={styles.micText}>🎙</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={loading || !text.trim()}
          style={[styles.send, (!text.trim() || loading) && styles.sendDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#0B0D12" />
          ) : (
            <Text style={styles.sendText}>Ask</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mic: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micText: { fontSize: 18 },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 18,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { color: '#0B0D12', fontWeight: '800' },
})
