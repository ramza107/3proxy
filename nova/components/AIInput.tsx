import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import {
  cancelVoiceRecording,
  requestMicPermission,
  startVoiceRecording,
  stopVoiceRecording,
  transcribeVoice,
} from '../lib/voice'

type Props = {
  placeholder?: string
  loading?: boolean
  onSend: (text: string) => void | Promise<void>
}

/**
 * Text + mic. Mic records → Groq/OpenAI Whisper on the AI server → sends as chat.
 */
export function AIInput({
  placeholder = 'What do you need to do?',
  loading,
  onSend,
}: Props) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const busy = useRef(false)

  const submit = async (value?: string) => {
    const next = (value ?? text).trim()
    if (!next || loading || transcribing) return
    setText('')
    await onSend(next)
  }

  const onMic = async () => {
    if (loading || transcribing || busy.current) return

    if (recording) {
      busy.current = true
      setRecording(false)
      setTranscribing(true)
      try {
        const file = await stopVoiceRecording()
        const lang =
          typeof Intl !== 'undefined' &&
          Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase().startsWith('ru')
            ? 'ru'
            : undefined
        const { text: heard } = await transcribeVoice(file, { language: lang })
        if (!heard.trim()) {
          Alert.alert('Voice', 'Could not hear anything — try again.')
          return
        }
        setText(heard)
        await submit(heard)
      } catch (e) {
        await cancelVoiceRecording().catch(() => undefined)
        Alert.alert(
          'Voice',
          e instanceof Error ? e.message : 'Transcription failed. Check the AI server / API key.',
        )
      } finally {
        setTranscribing(false)
        busy.current = false
      }
      return
    }

    busy.current = true
    try {
      const ok = await requestMicPermission()
      if (!ok) {
        Alert.alert(
          'Microphone',
          Platform.OS === 'web'
            ? 'Allow mic access in the browser to dictate tasks.'
            : 'Allow microphone access in system Settings to dictate tasks.',
        )
        return
      }
      await startVoiceRecording()
      setRecording(true)
    } catch (e) {
      Alert.alert('Microphone', e instanceof Error ? e.message : 'Could not start recording')
    } finally {
      busy.current = false
    }
  }

  const status = transcribing
    ? 'Transcribing with AI…'
    : recording
      ? 'Listening… tap mic to stop'
      : null

  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        style={styles.input}
        multiline
        editable={!loading && !transcribing}
        onSubmitEditing={() => submit()}
      />
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          onPress={onMic}
          style={[styles.mic, recording && styles.micHot]}
          hitSlop={8}
          disabled={loading || transcribing}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Start voice input'}
        >
          {transcribing ? (
            <ActivityIndicator color={colors.accentStrong} />
          ) : (
            <Text style={styles.micText}>{recording ? '■' : '🎙'}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => submit()}
          disabled={loading || transcribing || !text.trim()}
          style={[styles.send, (!text.trim() || loading || transcribing) && styles.sendDisabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
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
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 4,
    paddingTop: 6,
    fontFamily: fonts.body,
    letterSpacing: -0.2,
  },
  status: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: 4,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micHot: {
    backgroundColor: colors.danger,
  },
  micText: { fontSize: 18, color: colors.text },
  send: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 20,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 15 },
})
