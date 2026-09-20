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
}

let nativeRecording: NativeRecorder | null = null
let webMediaRecorder: MediaRecorder | null = null
let webChunks: Blob[] = []
let webStream: MediaStream | null = null

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
    webMediaRecorder.start()
    return
  }

  const { AudioModule, RecordingPresets, setAudioModeAsync } = await import('expo-audio')
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  })
  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY)
  await recorder.prepareToRecordAsync()
  recorder.record()
  nativeRecording = recorder
}

export async function stopVoiceRecording(): Promise<VoiceRecording> {
  if (Platform.OS === 'web') {
    const recorder = webMediaRecorder
    if (!recorder) throw new Error('Not recording')
    const blob: Blob = await new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        resolve(new Blob(webChunks, { type }))
      }
      recorder.onerror = () => reject(new Error('Recording failed'))
      try {
        recorder.stop()
      } catch (e) {
        reject(e)
      }
    })
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
  await recording.stop()
  const uri = recording.uri
  nativeRecording = null
  try {
    const { setAudioModeAsync } = await import('expo-audio')
    await setAudioModeAsync({ allowsRecording: false })
  } catch {
    // ignore
  }
  if (!uri) throw new Error('No recording saved')
  // Whisper accepts audio/mp4 for .m4a from expo-audio HIGH_QUALITY
  return { uri, mimeType: 'audio/mp4', filename: 'voice.m4a' }
}

export async function cancelVoiceRecording(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      webMediaRecorder?.stop()
      webStream?.getTracks().forEach((t) => t.stop())
      webMediaRecorder = null
      webStream = null
      webChunks = []
      return
    }
    if (nativeRecording) {
      await nativeRecording.stop()
      nativeRecording = null
    }
  } catch {
    nativeRecording = null
  }
}

/**
 * Upload audio for Whisper.
 * Native: expo-file-system multipart upload (RN {uri,name,type} FormData breaks
 * Expo’s fetch with “Unsupported FormDataPart implementation”).
 * Web: standard Blob FormData.
 */
export async function transcribeVoice(
  recording: VoiceRecording,
  opts?: { language?: string },
): Promise<{ text: string; raw: string; provider: string }> {
  const url = `${apiUrl}/api/ai/transcribe`

  if (Platform.OS === 'web') {
    const form = new FormData()
    const blob = await fetch(recording.uri).then((r) => r.blob())
    form.append('audio', blob, recording.filename)
    if (opts?.language) form.append('language', opts.language)
    const res = await fetch(url, { method: 'POST', body: form })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || `Transcribe failed (${res.status})`)
    }
    return res.json()
  }

  const FileSystem = await import('expo-file-system/legacy')
  const result = await FileSystem.uploadAsync(url, recording.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'audio',
    mimeType: recording.mimeType,
    parameters: opts?.language ? { language: opts.language } : {},
  })

  if (result.status < 200 || result.status >= 300) {
    throw new Error(result.body || `Transcribe failed (${result.status})`)
  }

  try {
    return JSON.parse(result.body) as { text: string; raw: string; provider: string }
  } catch {
    throw new Error(result.body || 'Invalid transcribe response')
  }
}
