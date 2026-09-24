import { useEffect, useRef, useState } from 'react'
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
import { useRouter } from 'expo-router'
import { colors, fonts, radii, spacing } from '../constants/theme'
import {
  cancelVoiceRecording,
  requestMicPermission,
  setVoiceMaxDurationHandler,
  startVoiceRecording,
  stopVoiceRecording,
  transcribeVoice,
} from '../lib/voice'
import {
  canUseVoice,
  consumeVoiceCredit,
  voiceDailyLimit,
  VOICE_COOLDOWN_MS,
  MAX_VOICE_SECONDS,
} from '../lib/pro'
import { useNovaStore } from '../lib/store'
import { useT } from '../lib/useT'

type Props = {
  placeholder?: string
  loading?: boolean
  onSend: (text: string) => void | Promise<void>
}

/** Absolute ceiling so “Transcribing…” can never stick forever. */
const UI_TRANSCRIBE_GUARD_MS = 40_000

/**
 * Text + mic. Mic records → Groq/OpenAI Whisper on the AI server → sends as chat.
 */
export function AIInput({
  placeholder = 'What do you need to do?',
  loading,
  onSend,
}: Props) {
  const t = useT()
  const router = useRouter()
  const userId = useNovaStore((s) => s.sessionUserId)
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const busy = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const lastVoiceAt = useRef(0)
  const recordingRef = useRef(false)
  const finishRef = useRef<(fromAutoStop?: boolean) => Promise<void>>(async () => undefined)

  const resetVoiceUi = () => {
    setRecording(false)
    recordingRef.current = false
    setTranscribing(false)
    busy.current = false
  }

  // Hard UI guard — if upload/Whisper hangs past the client race, still unlock Mic.
  useEffect(() => {
    if (!transcribing) return
    const timer = setTimeout(() => {
      abortRef.current?.abort()
      abortRef.current = null
      cancelVoiceRecording().catch(() => undefined)
      resetVoiceUi()
      Alert.alert(
        'Voice',
        'Transcription took too long — try again with a shorter message, or type it.',
      )
    }, UI_TRANSCRIBE_GUARD_MS)
    return () => clearTimeout(timer)
  }, [transcribing])

  const finishRecordingAndSend = async (fromAutoStop = false) => {
    if (busy.current && !fromAutoStop) return
    busy.current = true
    setRecording(false)
    recordingRef.current = false
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
        userId,
      })
      if (abort.signal.aborted) return

      if (!heard.trim()) {
        Alert.alert('Voice', 'Could not hear anything — try again.')
        return
      }

      consumeVoiceCredit()
      lastVoiceAt.current = Date.now()
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
  }

  finishRef.current = finishRecordingAndSend

  useEffect(() => {
    setVoiceMaxDurationHandler(() => {
      if (!recordingRef.current) return
      Alert.alert(t('pro.voiceMaxTitle'), t.tf('pro.voiceMaxBody', { n: MAX_VOICE_SECONDS }))
      void finishRef.current(true)
    })
    return () => setVoiceMaxDurationHandler(null)
  }, [t])

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

    if (transcribing) {
      await cancelActiveVoice()
      return
    }

    if (busy.current) return

    if (recording) {
      await finishRecordingAndSend(false)
      return
    }

    if (!canUseVoice()) {
      const n = voiceDailyLimit()
      Alert.alert(t('pro.voiceLimitTitle'), t.tf('pro.voiceLimitBody', { n }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('pro.upgrade'), onPress: () => router.push('/settings') },
      ])
      return
    }

    const since = Date.now() - lastVoiceAt.current
    if (lastVoiceAt.current && since < VOICE_COOLDOWN_MS) {
      Alert.alert(
        t('pro.voiceCooldownTitle'),
        t.tf('pro.voiceCooldownBody', { n: Math.ceil((VOICE_COOLDOWN_MS - since) / 1000) }),
      )
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
      recordingRef.current = true
      setRecording(true)
    } catch (e) {
      await cancelVoiceRecording().catch(() => undefined)
      Alert.alert('Microphone', e instanceof Error ? e.message : 'Could not start recording')
    } finally {
      busy.current = false
    }
  }

  const status = transcribing
    ? t('ai.transcribing')
    : recording
      ? t('ai.listening')
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
            transcribing ? t('ai.stop') : recording ? t('ai.stop') : t('ai.mic')
          }
        >
          {transcribing ? (
            <Text style={styles.micText}>✕</Text>
          ) : recording ? (
            <Text style={styles.micText}>{t('ai.stop')}</Text>
          ) : (
            <Text style={styles.micText}>{t('ai.mic')}</Text>
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
            <Text style={styles.sendText}>{t('ai.ask')}</Text>
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
