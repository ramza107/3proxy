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
  const abortRef = useRef<AbortController | null>(null)

  const resetVoiceUi = () => {
    setRecording(false)
    setTranscribing(false)
    busy.current = false
  }

  const submit = async (value?: string) => {
    const next = (value ?? text).trim()
    if (!next || loading || transcribing) return
    setText('')
    await onSend(next)
  }

  const cancelActiveVoice = async () => {
    abortRef.current?.abort()
    abortRef.current = null
    await cancelVoiceRecording().catch(() => undefined)
    resetVoiceUi()
  }

  const onMic = async () => {
    if (loading) return

    // Tap again while stuck on "Transcribing…" cancels instead of no-op.
    if (transcribing) {
      await cancelActiveVoice()
      return
    }

    if (busy.current) return

    if (recording) {
      busy.current = true
      setRecording(false)
      setTranscribing(true)
      const abort = new AbortController()
      abortRef.current = abort
      try {
        const file = await stopVoiceRecording()
        if (abort.signal.aborted) return

        const lang =
          typeof Intl !== 'undefined' &&
          Intl.DateTimeFormat().resolvedOptions().locale?.toLowerCase().startsWith('ru')
            ? 'ru'
            : undefined
        const { text: heard } = await transcribeVoice(file, {
          language: lang,
          signal: abort.signal,
        })
        if (abort.signal.aborted) return

        if (!heard.trim()) {
          Alert.alert('Voice', 'Could not hear anything — try again.')
          return
        }

        // Clear voice UI before chat send — onSend can be slow and must not
        // leave the mic button disabled forever on "Transcribing…".
        setText(heard)
        resetVoiceUi()
        abortRef.current = null
        await onSend(heard.trim())
      } catch (e) {
        if (abort.signal.aborted) return
        await cancelVoiceRecording().catch(() => undefined)
        const message =
          e instanceof Error ? e.message : 'Transcription failed. Check the AI server / API key.'
        Alert.alert('Voice', message)
      } finally {
        if (abortRef.current === abort) abortRef.current = null
        resetVoiceUi()
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
      await cancelVoiceRecording().catch(() => undefined)
      Alert.alert('Microphone', e instanceof Error ? e.message : 'Could not start recording')
    } finally {
      busy.current = false
    }
  }

  const status = transcribing
    ? 'Transcribing… tap Cancel to stop'
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
        editable={!loading && !transcribing && !recording}
        onSubmitEditing={() => submit()}
      />
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          onPress={onMic}
          style={[styles.mic, recording && styles.micHot, transcribing && styles.micCancel]}
          hitSlop={8}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={
            transcribing ? 'Cancel transcription' : recording ? 'Stop recording' : 'Start voice input'
          }
        >
          {transcribing ? (
            <Text style={styles.micText}>✕</Text>
          ) : recording ? (
            <Text style={styles.micText}>Stop</Text>
          ) : (
            <Text style={styles.micText}>Mic</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => submit()}
          disabled={loading || transcribing || recording || !text.trim()}
          style={[
            styles.send,
            (!text.trim() || loading || transcribing || recording) && styles.sendDisabled,
          ]}
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
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
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
    fontFamily: fonts.body,
  },
  status: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: 8,
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
  micHot: {
    backgroundColor: colors.danger,
  },
  micCancel: {
    backgroundColor: colors.bgSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
  },
  micText: { fontSize: 16, color: colors.text, fontFamily: fonts.bodyBold },
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
  sendText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
})
