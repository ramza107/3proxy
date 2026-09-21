import type OpenAI from 'openai'

const WHISPER_GROQ = 'whisper-large-v3-turbo'
const WHISPER_OPENAI = 'whisper-1'

/**
 * Transcribe audio with Groq Whisper (preferred) or OpenAI Whisper.
 * Returns cleaned text; optional light LLM polish for task-ready phrasing.
 */
export async function transcribeAudio(params: {
  buffer: Buffer
  filename: string
  mimeType?: string
  language?: string | null
  groqKey: string
  openaiKey: string
  polishClient?: OpenAI | null
  polishModel?: string | null
}): Promise<{ text: string; raw: string; provider: string }> {
  const file = new File([new Uint8Array(params.buffer)], params.filename || 'audio.m4a', {
    type: params.mimeType || 'audio/m4a',
  })

  let raw = ''
  let provider = ''

  const whisperTimeoutMs = 40_000

  if (params.groqKey && !params.groqKey.includes('your_groq')) {
    const form = new FormData()
    form.append('file', file)
    form.append('model', WHISPER_GROQ)
    form.append('response_format', 'json')
    form.append('temperature', '0')
    if (params.language) form.append('language', params.language)

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.groqKey}` },
      body: form,
      signal: AbortSignal.timeout(whisperTimeoutMs),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq Whisper failed: ${err.slice(0, 240)}`)
    }
    const data = (await res.json()) as { text?: string }
    raw = (data.text || '').trim()
    provider = 'groq-whisper'
  } else if (params.openaiKey && !params.openaiKey.includes('your-openai') && !params.openaiKey.includes('sk-your')) {
    const form = new FormData()
    form.append('file', file)
    form.append('model', WHISPER_OPENAI)
    form.append('response_format', 'json')
    if (params.language) form.append('language', params.language)

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.openaiKey}` },
      body: form,
      signal: AbortSignal.timeout(whisperTimeoutMs),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI Whisper failed: ${err.slice(0, 240)}`)
    }
    const data = (await res.json()) as { text?: string }
    raw = (data.text || '').trim()
    provider = 'openai-whisper'
  } else {
    throw new Error('No Whisper API key (set GROQ_API_KEY or OPENAI_API_KEY)')
  }

  if (!raw) {
    return { text: '', raw: '', provider }
  }

  let text = raw
  if (params.polishClient && params.polishModel) {
    try {
      const completion = await params.polishClient.chat.completions.create({
        model: params.polishModel,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You clean speech-to-text for a life assistant. Fix obvious STT errors, keep the user language (RU or EN), keep meaning. Return ONLY the cleaned phrase — no quotes, no commentary.',
          },
          { role: 'user', content: raw },
        ],
      })
      const polished = completion.choices[0]?.message?.content?.trim()
      if (polished) text = polished.replace(/^["«]|["»]$/g, '')
    } catch {
      // keep raw
    }
  }

  return { text, raw, provider }
}
