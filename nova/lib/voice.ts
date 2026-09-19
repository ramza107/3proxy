import { Platform } from 'react-native'
import { apiUrl } from './api'

export type VoiceRecording = {
  uri: string
  mimeType: string
  filename: string
}

type NativeRecorder = {
  stopAndUnloadAsync: () => Promise<unknown>
  getURI: () => string | null
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
    const { Audio } = await import('expo-av')
    const { granted } = await Audio.requestPermissionsAsync()
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

  const { Audio } = await import('expo-av')
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  })
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  )
  nativeRecording = recording
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
  await recording.stopAndUnloadAsync()
  const uri = recording.getURI()
  nativeRecording = null
  try {
    const { Audio } = await import('expo-av')
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
  } catch {
    // ignore
  }
  if (!uri) throw new Error('No recording saved')
  return { uri, mimeType: 'audio/m4a', filename: 'voice.m4a' }
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
      await nativeRecording.stopAndUnloadAsync()
      nativeRecording = null
    }
  } catch {
    nativeRecording = null
  }
}

export async function transcribeVoice(
  recording: VoiceRecording,
  opts?: { language?: string },
): Promise<{ text: string; raw: string; provider: string }> {
  const form = new FormData()

  if (Platform.OS === 'web') {
    const blob = await fetch(recording.uri).then((r) => r.blob())
    form.append('audio', blob, recording.filename)
  } else {
    // React Native FormData file shape
    form.append('audio', {
      uri: recording.uri,
      name: recording.filename,
      type: recording.mimeType,
    } as unknown as Blob)
  }
  if (opts?.language) form.append('language', opts.language)

  const res = await fetch(`${apiUrl}/api/ai/transcribe`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Transcribe failed (${res.status})`)
  }
  return res.json()
}
