import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { z } from 'zod'
import { demoCalendarEvents, listCalendarEvents } from './google/calendar.js'
import {
  buildAuthUrl,
  exchangeCode,
  googleConfigured,
  resolveAppReturnUrl,
  parseOAuthState,
} from './google/oauth.js'
import { checkChatRateLimit } from './chatGuard.js'
import { deleteConnection, getConnection, saveConnection } from './google/store.js'
import { localAI } from './localAI.js'
import { sanitizeAIActions } from './aiActions.js'
import { SYSTEM_PROMPT } from './prompt.js'
import { toneInstructions } from './tone.js'
import { transcribeAudio } from './transcribe.js'
import {
  assertVoicePayloadSize,
  checkVoiceRateLimit,
  voiceUploadLimits,
} from './voiceGuard.js'
import { fetchQuotes } from './invest/quotes.js'
import { buildYesterdayNews, NEWS_INTERESTS } from './news/yesterday.js'

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname })
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
})

const uploadVoice = multer({
  storage: multer.memoryStorage(),
  limits: voiceUploadLimits(),
})

const Port = Number(process.env.PORT || 8787)
/** Short-lived OAuth CSRF nonces: nonce → userId */
const oauthNonces = new Map<
  string,
  { userId: string; client: 'web' | 'native'; expires: number; used?: boolean }
>()

const groqKey = process.env.GROQ_API_KEY || ''
const openaiKey = process.env.OPENAI_API_KEY || ''

type Provider = {
  name: 'groq' | 'openai'
  client: OpenAI
  model: string
}

function resolveProvider(): Provider | null {
  // Prefer Groq (free tier) when configured.
  if (groqKey && !groqKey.includes('your-groq')) {
    return {
      name: 'groq',
      client: new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      }),
      // Fast free-tier default; override with GROQ_MODEL if needed.
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    }
  }

  if (openaiKey && !openaiKey.includes('your-openai')) {
    return {
      name: 'openai',
      client: new OpenAI({ apiKey: openaiKey }),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    }
  }

  return null
}

const bodySchema = z.object({
  message: z.string().min(1),
  user_id: z.string().min(1),
  user_name: z.string().nullable().optional(),
  current_date: z.string().optional(),
  timezone: z.string().optional(),
  weekday: z.string().optional(),
  ai_tone: z.enum(['friendly', 'concise', 'coach']).optional(),
  /** Advisory until StoreKit receipts are verified server-side. */
  is_pro: z.boolean().optional(),
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        date: z.string().nullable().optional(),
        time: z.string().nullable().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        completed: z.boolean().optional(),
      }),
    )
    .optional()
    .default([]),
  bills: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        amount: z.number().optional(),
        currency: z.string().optional(),
        dayOfMonth: z.number().optional(),
        category: z.string().optional(),
        lastPaidMonth: z.string().nullable().optional(),
        active: z.boolean().optional(),
      }),
    )
    .optional()
    .default([]),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
})

function buildContext(input: z.infer<typeof bodySchema>) {
  const today = input.current_date || new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  const tz = input.timezone || 'local'
  const weekday = input.weekday || ''
  const open = input.tasks.filter((t) => !t.completed)
  const todayTasks = open.filter((t) => t.date === today)
  const upcoming = open
    .filter((t) => t.date && t.date > today)
    .slice(0, 8)
    .map((t) => `- ${t.title}${t.date ? ` (${t.date}${t.time ? ` ${t.time}` : ''})` : ''} [id:${t.id}]`)
    .join('\n')

  const activeBills = (input.bills || []).filter((b) => b.active !== false)
  const unpaid = activeBills.filter((b) => !b.lastPaidMonth || b.lastPaidMonth < month)
  const billsBlock = unpaid.length
    ? unpaid
        .slice(0, 12)
        .map(
          (b) =>
            `- ${b.title} ${b.amount ?? '?'} ${b.currency || ''} due day ${b.dayOfMonth ?? '?'} [id:${b.id}]`,
        )
        .join('\n')
    : '- none unpaid'

  return `Current date (user local calendar — NOT UTC):
${today}${weekday ? ` (${weekday})` : ''}
Timezone: ${tz}
Tomorrow is the next calendar day after Current date.

User:
${input.user_name || 'Friend'}

Today's tasks:
${
  todayTasks.length
    ? todayTasks
        .map(
          (t) =>
            `- ${t.title}${t.time ? ` at ${t.time}` : ''} (${t.priority || 'medium'}) [id:${t.id}]`,
        )
        .join('\n')
    : '- none'
}

Upcoming:
${upcoming || '- none'}

Unpaid bills this month (use ids for mark_bill_paid):
${billsBlock}

All open tasks with ids (use these ids for update/complete/delete):
${
  open.length
    ? open
        .map(
          (t) =>
            `- ${t.title} | date:${t.date || 'null'} time:${t.time || 'null'} priority:${t.priority || 'medium'} id:${t.id}`,
        )
        .join('\n')
    : '- none'
}`
}

function safeParseModelJson(raw: string) {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(candidate)
}

app.get('/health', (_req, res) => {
  const provider = resolveProvider()
  res.json({
    ok: true,
    provider: provider?.name || 'local',
    model: provider?.model || null,
    groq: Boolean(groqKey && !groqKey.includes('your-groq')),
    openai: Boolean(openaiKey && !openaiKey.includes('your-openai')),
    google: googleConfigured(),
  })
})

/** Yesterday’s headlines for selected interest filters (RSS, no API key). */
app.get('/api/news/yesterday', async (req, res) => {
  try {
    const interestsRaw = String(req.query.interests || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const digest = await buildYesterdayNews({
      interests: interestsRaw,
      timeZone: String(req.query.timezone || req.query.tz || 'UTC'),
      language: String(req.query.lang || req.query.language || 'en'),
      demo: String(req.query.demo || '') === '1' || String(req.query.demo || '') === 'true',
      refresh: String(req.query.refresh || '') === '1',
    })
    return res.json(digest)
  } catch (error) {
    console.error('news/yesterday', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'news failed',
      interests: NEWS_INTERESTS,
    })
  }
})

app.get('/api/news/interests', (_req, res) => {
  res.json({ interests: NEWS_INTERESTS })
})

/** Live / delayed market quotes for Invest (Pro) — Yahoo + Coinbase, no API key. */
app.get('/api/invest/quotes', async (req, res) => {
  try {
    const symbols = String(req.query.symbols || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!symbols.length) {
      return res.status(400).json({ error: 'symbols required', quotes: [] })
    }
    const demo =
      String(req.query.demo || '') === '1' || String(req.query.demo || '') === 'true'
    const result = await fetchQuotes(symbols, { demo })
    return res.json({
      quotes: result.quotes,
      demo: result.demo,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('invest/quotes', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'quotes failed',
      quotes: [],
    })
  }
})

app.get('/api/google/status', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    if (!userId) return res.status(400).json({ error: 'user_id required' })
    const conn = await getConnection(userId)
    return res.json({
      configured: googleConfigured(),
      connected: Boolean(conn),
      email: conn?.email || null,
      provider: conn?.provider || null,
    })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'status failed',
    })
  }
})

app.get('/api/google/connect', (req, res) => {
  const userId = String(req.query.user_id || '')
  if (!userId) return res.status(400).json({ error: 'user_id required' })
  if (!googleConfigured()) {
    return res.status(503).json({
      error: 'Google OAuth not configured',
      hint: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI on the AI server (one-time). Users then only tap Allow.',
    })
  }
  const clientRaw = String(req.query.client || req.query.return || 'web').toLowerCase()
  const client: 'web' | 'native' = clientRaw === 'native' || clientRaw === 'mobile' ? 'native' : 'web'
  const nonce = crypto.randomBytes(16).toString('hex')
  // Kept for legacy / optional replay hints; return client is signed into OAuth state
  oauthNonces.set(nonce, { userId, client, expires: Date.now() + 15 * 60 * 1000 })
  const url = buildAuthUrl(userId, nonce, client)
  // JSON for clients that prefer to open the URL themselves
  if (String(req.query.format || '') === 'json' || req.accepts('json') === 'json' && !req.accepts('html')) {
    return res.json({ url })
  }
  return res.redirect(url)
})

async function handleGoogleOAuthCallback(req: express.Request, res: express.Response) {
  const code = String(req.query.code || '')
  const state = String(req.query.state || '')
  const parsed = parseOAuthState(state)
  const client = parsed?.client || 'web'
  const appUrl = resolveAppReturnUrl(client)

  const fail = () => res.redirect(`${appUrl}settings?google=error`)

  try {
    if (!code || !parsed) return fail()

    // Optional one-time nonce (best-effort); signed state alone is enough after Render sleep
    if (parsed.nonce) {
      const seen = oauthNonces.get(parsed.nonce)
      if (seen?.used) return fail()
      oauthNonces.set(parsed.nonce, {
        userId: parsed.userId,
        client: parsed.client,
        expires: Date.now() + 10 * 60 * 1000,
        used: true,
      })
    }

    const tokens = await exchangeCode(code)
    const existing = await getConnection(parsed.userId)
    await saveConnection({
      userId: parsed.userId,
      provider: 'google',
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || existing?.refreshToken || '',
      expiryDate: tokens.expiryDate,
      updatedAt: new Date().toISOString(),
    })
    return res.redirect(`${appUrl}settings?google=connected`)
  } catch (error) {
    console.error('google oauth callback', error)
    return fail()
  }
}

app.get('/api/google/callback', handleGoogleOAuthCallback)
/** Legacy redirect URI still registered in some Google Cloud consoles / Render envs. */
app.get('/api/email/callback', handleGoogleOAuthCallback)

app.post('/api/google/disconnect', async (req, res) => {
  try {
    const userId = String(req.body?.user_id || '')
    if (!userId) return res.status(400).json({ error: 'user_id required' })
    await deleteConnection(userId)
    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'disconnect failed',
    })
  }
})

/** Google Calendar events (primary) for a time range. */
app.get('/api/calendar/events', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    const allowDemo = String(req.query.demo || '') === '1'
    const from = String(req.query.from || '')
    const to = String(req.query.to || '')
    if (!userId) return res.status(400).json({ error: 'user_id required' })

    const day =
      from && /^\d{4}-\d{2}-\d{2}/.test(from)
        ? from.slice(0, 10)
        : new Date().toISOString().slice(0, 10)

    const conn = await getConnection(userId)
    if (!conn) {
      if (allowDemo) {
        return res.json({
          connected: false,
          email: null,
          demo: true,
          events: demoCalendarEvents(day),
          generatedAt: new Date().toISOString(),
        })
      }
      return res.json({
        connected: false,
        email: null,
        demo: false,
        events: [],
        generatedAt: new Date().toISOString(),
      })
    }

    const timeMin = from || `${day}T00:00:00.000Z`
    const timeMax = to || `${day}T23:59:59.999Z`
    const { email, events } = await listCalendarEvents(userId, { from: timeMin, to: timeMax })
    return res.json({
      connected: true,
      email,
      demo: false,
      events,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('calendar', error)
    const msg = error instanceof Error ? error.message : 'calendar failed'
    const needsReconnect = /permission missing|reconnect/i.test(msg)
    return res.status(needsReconnect ? 403 : 500).json({ error: msg })
  }
})

/** Speech → text via Groq/OpenAI Whisper (+ optional LLM polish). */
app.post('/api/ai/transcribe', (req, res, next) => {
  uploadVoice.single('audio')(req, res, (err) => {
    if (err) {
      const msg =
        err instanceof Error && /File too large|LIMIT_FILE_SIZE/i.test(err.message)
          ? 'Audio too long — keep under ~60 seconds'
          : err instanceof Error
            ? err.message
            : 'Upload failed'
      return res.status(413).json({ error: msg })
    }
    next()
  })
}, async (req, res) => {
  try {
    const file = req.file
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: 'audio file required (field: audio)' })
    }
    try {
      assertVoicePayloadSize(file.buffer.length)
    } catch (e) {
      return res.status(413).json({
        error: e instanceof Error ? e.message : 'Audio rejected',
      })
    }

    const userId = String(req.body?.user_id || '') || null
    const isPro =
      req.body?.is_pro === true ||
      req.body?.is_pro === 1 ||
      String(req.body?.is_pro || '') === '1' ||
      String(req.query.is_pro || '') === '1'
    if (!isPro) {
      return res.status(402).json({
        error: 'Voice is Wahrly Pro — turn on Pro in Settings',
        code: 'pro_required',
      })
    }
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : null) ||
      req.socket.remoteAddress ||
      null
    const limited = checkVoiceRateLimit({ userId, ip })
    if (limited) {
      return res.status(429).json({ error: limited })
    }

    const language = String(req.body?.language || req.query.language || '') || null
    const result = await transcribeAudio({
      buffer: file.buffer,
      filename: file.originalname || 'voice.m4a',
      mimeType: file.mimetype,
      language,
      groqKey,
      openaiKey,
      // Skip LLM polish on the hot path — Whisper text is enough and polish caused hangs.
      polishClient: null,
      polishModel: null,
    })
    if (!result.text) {
      return res.status(422).json({ error: 'Could not hear speech — try again closer to the mic' })
    }
    return res.json(result)
  } catch (error) {
    console.error('transcribe', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'transcribe failed',
    })
  }
})

app.post('/api/ai/chat', async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const input = parsed.data
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : null) ||
      req.socket?.remoteAddress ||
      null
    const chatLimit = checkChatRateLimit({
      userId: input.user_id,
      ip,
      isPro: input.is_pro === true,
    })
    if (chatLimit) {
      return res.status(429).json({ error: chatLimit, code: 'chat_limit' })
    }

    const context = buildContext(input)
    const today = input.current_date || new Date().toISOString().slice(0, 10)
    const provider = resolveProvider()

    if (!provider) {
      const local = localAI(input.message, input.tasks, today, input.bills)
      const knownTasks = new Set(input.tasks.map((t) => t.id))
      const knownBills = new Set(input.bills.map((b) => b.id))
      const { actions } = sanitizeAIActions(local.actions, knownTasks, knownBills)
      return res.json({ reply: local.reply, actions, provider: 'local' })
    }

    try {
      const completion = await provider.client.chat.completions.create({
        model: provider.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: toneInstructions(input.ai_tone) },
          { role: 'system', content: context },
          ...input.history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: input.message },
        ],
      })

      const content =
        completion.choices[0]?.message?.content ||
        '{"reply":"I could not process that.","actions":[]}'
      const json = safeParseModelJson(content)
      if (!json.reply || !Array.isArray(json.actions)) {
        return res.status(502).json({ error: 'Malformed AI response', raw: json })
      }
      const knownTasks = new Set(input.tasks.map((t) => t.id))
      const knownBills = new Set(input.bills.map((b) => b.id))
      const { actions, dropped } = sanitizeAIActions(json.actions, knownTasks, knownBills)
      let reply = String(json.reply)
      if (dropped > 0 && actions.length === 0) {
        reply =
          /[а-яё]/i.test(input.message)
            ? `${reply}\n\nНе смог применить действие — уточни задачу или скажи иначе.`
            : `${reply}\n\nI couldn’t apply that action — name the task more clearly?`
      }
      return res.json({ reply, actions, provider: provider.name, dropped })
    } catch (providerError) {
      console.warn(`${provider.name} unavailable, using local AI:`, providerError)
      const local = localAI(input.message, input.tasks, today, input.bills)
      const knownTasks = new Set(input.tasks.map((t) => t.id))
      const knownBills = new Set(input.bills.map((b) => b.id))
      const { actions } = sanitizeAIActions(local.actions, knownTasks, knownBills)
      return res.json({ reply: local.reply, actions, fallback: true, provider: 'local' })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI failed',
    })
  }
})

app.listen(Port, '0.0.0.0', () => {
  const provider = resolveProvider()
  console.log(`Wahrly AI server listening on http://0.0.0.0:${Port}`)
  console.log(`Provider: ${provider?.name || 'local'} ${provider?.model || ''}`.trim())
})
