import type OpenAI from 'openai'

const WHISPER_GROQ = 'whisper-large-v3-turbo'
const WHISPER_OPENAI = 'whisper-1'

async function whisperVia(
  endpoint: string,
  apiKey: string,
  model: string,
  file: File,
  language: string | null,
  timeoutMs: number,
): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('model', model)
  form.append('response_format', 'json')
  form.append('temperature', '0')
  if (language) form.append('language', language)

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${err.slice(0, 240)}`)
  }
  const data = (await res.json()) as { text?: string }
  return (data.text || '').trim()
}

/**
 * Transcribe audio with Groq Whisper (preferred) or OpenAI Whisper.
 * Falls back Groq → OpenAI on failure. Polish is optional and hard-capped.
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

  const whisperTimeoutMs = 25_000
  const groqOk = Boolean(params.groqKey && !params.groqKey.includes('your_groq'))
  const openaiOk = Boolean(
    params.openaiKey &&
      !params.openaiKey.includes('your-openai') &&
      !params.openaiKey.includes('sk-your'),
  )

  if (!groqOk && !openaiOk) {
    throw new Error('No Whisper API key (set GROQ_API_KEY or OPENAI_API_KEY)')
  }

  let raw = ''
  let provider = ''
  let lastError: Error | null = null

  if (groqOk) {
    try {
      raw = await whisperVia(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        params.groqKey,
        WHISPER_GROQ,
        file,
        params.language || null,
        whisperTimeoutMs,
      )
      provider = 'groq-whisper'
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  if (!raw && openaiOk) {
    try {
      raw = await whisperVia(
        'https://api.openai.com/v1/audio/transcriptions',
        params.openaiKey,
        WHISPER_OPENAI,
        file,
        params.language || null,
        whisperTimeoutMs,
      )
      provider = 'openai-whisper'
      lastError = null
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  if (!raw && lastError) {
    throw new Error(`Whisper failed: ${lastError.message.slice(0, 200)}`)
  }

  if (!raw) {
    return { text: '', raw: '', provider }
  }

  let text = raw
  // Skip polish by default for speed/reliability — STT text is usually good enough.
  // Only polish short phrases when explicitly configured and under a hard timeout.
  if (params.polishClient && params.polishModel && raw.length <= 280) {
    try {
      const completion = await Promise.race([
        params.polishClient.chat.completions.create({
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
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4_000)),
      ])
      const polished = completion?.choices[0]?.message?.content?.trim()
      if (polished) text = polished.replace(/^["«]|["»]$/g, '')
    } catch {
      // keep raw
    }
  }

  return { text, raw, provider }
}
