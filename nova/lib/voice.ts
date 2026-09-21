import { Platform } from 'react-native'
import { apiUrl } from './api'

export type VoiceRecording = {
  uri: string
  mimeType: string
  filename: string
}

type NativeRecorder = {
  uri: string | null
  prepareToRecordAsync: () => Promise<void>
  record: () => void
  stop: () => Promise<void>
  release?: () => void
}

const STOP_MS = 8_000
const PREPARE_MS = 10_000
const TRANSCRIBE_MS = 55_000

let nativeRecording: NativeRecorder | null = null
let webMediaRecorder: MediaRecorder | null = null
let webChunks: Blob[] = []
let webStream: MediaStream | null = null
let transcribeAbort: AbortController | null = null

function formatTranscribeError(body: string, status: number): string {
  const raw = (body || '').trim()
  if (!raw) return `Transcribe failed (${status})`
  try {
    const parsed = JSON.parse(raw) as { error?: string }
    if (parsed?.error) return parsed.error
  } catch {
    // plain text
  }
  return raw.slice(0, 280)
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function resetNativeAudioMode(): Promise<void> {
  try {
    const { setAudioModeAsync } = await import('expo-audio')
    await withTimeout(
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }),
      3_000,
      'Release mic',
    )
  } catch {
    // Best-effort; never block UI on audio-mode teardown.
  }
}

function releaseNativeRecorder(recorder: NativeRecorder | null): void {
  if (!recorder) return
  try {
    recorder.release?.()
  } catch {
    // ignore
  }
}

async function stopWebTracks(): Promise<void> {
  try {
    webMediaRecorder?.stop()
  } catch {
    // ignore
  }
  webStream?.getTracks().forEach((t) => t.stop())
  webMediaRecorder = null
  webStream = null
  webChunks = []
}

export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      return true
    } catch {
      return false
    }
  }
  try {
    const { requestRecordingPermissionsAsync } = await import('expo-audio')
    const { granted } = await requestRecordingPermissionsAsync()
    return granted
  } catch {
    return false
  }
}

export async function startVoiceRecording(): Promise<void> {
  // Clear any leftover session so a second tap never fights a stuck recorder.
  await cancelVoiceRecording().catch(() => undefined)

  if (Platform.OS === 'web') {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Voice recording is not supported in this browser')
    }
    webStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    webChunks = []
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    webMediaRecorder = mime
      ? new MediaRecorder(webStream, { mimeType: mime })
      : new MediaRecorder(webStream)
    webMediaRecorder.ondataavailable = (e) => {
      if (e.data?.size) webChunks.push(e.data)
    }
    webMediaRecorder.start(250)
    return
  }

  const { AudioModule, RecordingPresets, setAudioModeAsync } = await import('expo-audio')
  await withTimeout(
    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    }),
    5_000,
    'Enable mic',
  )

  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY) as NativeRecorder
  nativeRecording = recorder
  try {
    await withTimeout(recorder.prepareToRecordAsync(), PREPARE_MS, 'Prepare recorder')
    recorder.record()
  } catch (error) {
    nativeRecording = null
    releaseNativeRecorder(recorder)
    await resetNativeAudioMode()
    throw error
  }
}

export async function stopVoiceRecording(): Promise<VoiceRecording> {
  if (Platform.OS === 'web') {
    const recorder = webMediaRecorder
    if (!recorder) throw new Error('Not recording')
    const blob: Blob = await withTimeout(
      new Promise<Blob>((resolve, reject) => {
        const finish = () => {
          const type = recorder.mimeType || 'audio/webm'
          resolve(new Blob(webChunks, { type }))
        }
        recorder.onstop = finish
        recorder.onerror = () => reject(new Error('Recording failed'))
        try {
          if (recorder.state === 'inactive') {
            finish()
            return
          }
          recorder.requestData?.()
          recorder.stop()
        } catch (e) {
          reject(e)
        }
      }),
      STOP_MS,
      'Stop recording',
    )
    webStream?.getTracks().forEach((t) => t.stop())
    webStream = null
    webMediaRecorder = null
    webChunks = []
    const uri = URL.createObjectURL(blob)
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    return { uri, mimeType: blob.type || 'audio/webm', filename: `voice.${ext}` }
  }

  const recording = nativeRecording
  if (!recording) throw new Error('Not recording')
  nativeRecording = null

  try {
    await withTimeout(recording.stop(), STOP_MS, 'Stop recording')
  } catch (error) {
    releaseNativeRecorder(recording)
    await resetNativeAudioMode()
    throw error
  }

  const uri = recording.uri
  releaseNativeRecorder(recording)
  await resetNativeAudioMode()

  if (!uri) throw new Error('No recording saved')
  // Whisper accepts audio/mp4 for .m4a from expo-audio HIGH_QUALITY
  return { uri, mimeType: 'audio/mp4', filename: 'voice.m4a' }
}

/** Always safe to call — tears down web/native recorders and releases the mic. */
export async function cancelVoiceRecording(): Promise<void> {
  try {
    transcribeAbort?.abort()
  } catch {
    // ignore
  }
  transcribeAbort = null

  if (Platform.OS === 'web') {
    await stopWebTracks()
    return
  }

  const recording = nativeRecording
  nativeRecording = null
  if (recording) {
    try {
      await withTimeout(recording.stop(), STOP_MS, 'Cancel recording')
    } catch {
      // ignore — still release below
    }
    releaseNativeRecorder(recording)
  }
  await resetNativeAudioMode()
}

/**
 * Upload audio for Whisper.
 * Native: expo-file-system multipart upload (RN {uri,name,type} FormData breaks
 * Expo’s fetch with “Unsupported FormDataPart implementation”).
 * Web: standard Blob FormData.
 */
export async function transcribeVoice(
  recording: VoiceRecording,
  opts?: { language?: string; signal?: AbortSignal },
): Promise<{ text: string; raw: string; provider: string }> {
  const url = `${apiUrl}/api/ai/transcribe`
  const localAbort = new AbortController()
  transcribeAbort = localAbort

  const onExternalAbort = () => localAbort.abort()
  opts?.signal?.addEventListener('abort', onExternalAbort)

  const timedOut = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      localAbort.abort()
      reject(new Error(`Transcription timed out after ${Math.round(TRANSCRIBE_MS / 1000)}s`))
    }, TRANSCRIBE_MS)
    localAbort.signal.addEventListener('abort', () => clearTimeout(timer))
  })

  try {
    if (Platform.OS === 'web') {
      const form = new FormData()
      const blob = await fetch(recording.uri).then((r) => r.blob())
      form.append('audio', blob, recording.filename)
      if (opts?.language) form.append('language', opts.language)

      const res = await Promise.race([
        fetch(url, { method: 'POST', body: form, signal: localAbort.signal }),
        timedOut,
      ])
      if (!res.ok) {
        const text = await res.text()
        throw new Error(formatTranscribeError(text, res.status))
      }
      return res.json()
    }

    const FileSystem = await import('expo-file-system/legacy')
    const result = await Promise.race([
      FileSystem.uploadAsync(url, recording.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'audio',
        mimeType: recording.mimeType,
        parameters: opts?.language ? { language: opts.language } : {},
      }),
      timedOut,
    ])

    if (result.status < 200 || result.status >= 300) {
      throw new Error(formatTranscribeError(result.body, result.status))
    }

    try {
      return JSON.parse(result.body) as { text: string; raw: string; provider: string }
    } catch {
      throw new Error(result.body || 'Invalid transcribe response')
    }
  } finally {
    opts?.signal?.removeEventListener('abort', onExternalAbort)
    if (transcribeAbort === localAbort) transcribeAbort = null
  }
}
