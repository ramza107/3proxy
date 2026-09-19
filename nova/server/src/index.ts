import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { z } from 'zod'
import { buildDigest, demoDigest } from './email/digest.js'
import {
  buildAuthUrl,
  exchangeCode,
  gmailConfigured,
  resolveAppReturnUrl,
  listOvernightMessages,
  listRecentInboxMessages,
  listRecentSentMessages,
  parseOAuthState,
} from './email/gmail.js'
import { buildMeetingsDigest, demoMeetings } from './email/meetings.js'
import { buildPromisesDigest, demoPromises } from './email/promises.js'
import {
  getPushToken,
  listPushUsers,
  markAlertPushed,
  savePushToken,
  sendExpoPush,
  wasAlertPushed,
} from './email/pushStore.js'
import { deleteConnection, getConnection, saveConnection } from './email/store.js'
import { localAI } from './localAI.js'
import { SYSTEM_PROMPT } from './prompt.js'
import { transcribeAudio } from './transcribe.js'

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname })
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
})

const Port = Number(process.env.PORT || 8787)
/** Short-lived OAuth CSRF nonces: nonce → userId */
const oauthNonces = new Map<
  string,
  { userId: string; client: 'web' | 'native'; expires: number }
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
  const open = input.tasks.filter((t) => !t.completed)
  const todayTasks = open.filter((t) => t.date === today)
  const upcoming = open
    .filter((t) => t.date && t.date > today)
    .slice(0, 8)
    .map((t) => `- ${t.title}${t.date ? ` (${t.date}${t.time ? ` ${t.time}` : ''})` : ''} [id:${t.id}]`)
    .join('\n')

  return `Current date:
${today}
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
    gmail: gmailConfigured(),
  })
})

app.get('/api/email/status', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    if (!userId) return res.status(400).json({ error: 'user_id required' })
    const conn = await getConnection(userId)
    return res.json({
      configured: gmailConfigured(),
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

app.get('/api/email/connect', (req, res) => {
  const userId = String(req.query.user_id || '')
  if (!userId) return res.status(400).json({ error: 'user_id required' })
  if (!gmailConfigured()) {
    return res.status(503).json({
      error: 'Gmail OAuth not configured',
      hint: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI on the AI server (one-time). Users then only tap Allow.',
    })
  }
  const clientRaw = String(req.query.client || req.query.return || 'web').toLowerCase()
  const client: 'web' | 'native' = clientRaw === 'native' || clientRaw === 'mobile' ? 'native' : 'web'
  const nonce = crypto.randomBytes(16).toString('hex')
  oauthNonces.set(nonce, { userId, client, expires: Date.now() + 10 * 60 * 1000 })
  const url = buildAuthUrl(userId, nonce)
  // JSON for clients that prefer to open the URL themselves
  if (String(req.query.format || '') === 'json' || req.accepts('json') === 'json' && !req.accepts('html')) {
    return res.json({ url })
  }
  return res.redirect(url)
})

app.get('/api/email/callback', async (req, res) => {
  const code = String(req.query.code || '')
  const state = String(req.query.state || '')
  const parsed = parseOAuthState(state)
  const nonceRow = parsed ? oauthNonces.get(parsed.nonce) : undefined
  const client = nonceRow?.client || 'web'
  const appUrl = resolveAppReturnUrl(client)

  const fail = () => res.redirect(`${appUrl}settings?gmail=error`)

  try {
    if (!code || !parsed) return fail()
    oauthNonces.delete(parsed.nonce)
    if (!nonceRow || nonceRow.userId !== parsed.userId || nonceRow.expires < Date.now()) {
      return fail()
    }

    const tokens = await exchangeCode(code)
    await saveConnection({
      userId: parsed.userId,
      provider: 'gmail',
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryDate: tokens.expiryDate,
      updatedAt: new Date().toISOString(),
    })
    return res.redirect(`${appUrl}settings?gmail=connected`)
  } catch (error) {
    console.error('gmail callback', error)
    return fail()
  }
})

app.post('/api/email/disconnect', async (req, res) => {
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

app.get('/api/email/digest', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    const timeZone = String(req.query.timezone || req.query.tz || '')
    const allowDemo = String(req.query.demo || '') === '1'
    if (!userId) return res.status(400).json({ error: 'user_id required' })

    const conn = await getConnection(userId)
    if (!conn) {
      if (allowDemo) return res.json(demoDigest(timeZone))
      return res.json({
        connected: false,
        email: null,
        demo: false,
        total: 0,
        senders: [],
        summary: 'Connect Gmail in Settings to get yesterday’s inbox brief.',
        highlights: [],
        generatedAt: new Date().toISOString(),
      })
    }

    const messages = await listOvernightMessages(userId, { timeZone })
    const provider = resolveProvider()
    const digest = await buildDigest({
      messages,
      email: conn.email,
      timeZone,
      provider: provider ? { client: provider.client, model: provider.model } : null,
    })
    return res.json(digest)
  } catch (error) {
    console.error('digest', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'digest failed',
    })
  }
})

app.get('/api/email/promises', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    const allowDemo = String(req.query.demo || '') === '1'
    const days = Number(req.query.days || 7)
    if (!userId) return res.status(400).json({ error: 'user_id required' })

    const conn = await getConnection(userId)
    if (!conn) {
      if (allowDemo) return res.json(demoPromises())
      return res.json({
        connected: false,
        email: null,
        demo: false,
        summary: 'Connect Gmail to catch promises you made in sent mail.',
        promises: [],
        scanned: 0,
        generatedAt: new Date().toISOString(),
        days: 7,
      })
    }

    const messages = await listRecentSentMessages(userId, { days, max: 25 })
    const provider = resolveProvider()
    const digest = await buildPromisesDigest({
      messages,
      email: conn.email,
      days: Number.isFinite(days) ? days : 7,
      provider: provider ? { client: provider.client, model: provider.model } : null,
    })
    return res.json(digest)
  } catch (error) {
    console.error('promises', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'promises failed',
    })
  }
})

/** Scan recent Primary inbox for meet / call / report asks. */
app.get('/api/email/meetings', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    const allowDemo = String(req.query.demo || '') === '1'
    const hours = Number(req.query.hours || 48)
    if (!userId) return res.status(400).json({ error: 'user_id required' })

    const conn = await getConnection(userId)
    if (!conn) {
      if (allowDemo) return res.json(demoMeetings())
      return res.json({
        connected: false,
        email: null,
        demo: false,
        summary: 'Connect Gmail to get alerts when someone asks to meet or wants a report.',
        meetings: [],
        scanned: 0,
        generatedAt: new Date().toISOString(),
        hours: 48,
      })
    }

    const safeHours = Number.isFinite(hours) ? hours : 48
    const messages = await listRecentInboxMessages(userId, { hours: safeHours, max: 30 })
    const provider = resolveProvider()
    const digest = await buildMeetingsDigest({
      messages,
      email: conn.email,
      hours: safeHours,
      provider: provider ? { client: provider.client, model: provider.model } : null,
    })
    return res.json(digest)
  } catch (error) {
    console.error('meetings', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'meetings failed',
    })
  }
})

/** Register Expo push token for meeting-email alerts while the app is closed. */
app.post('/api/push/register', async (req, res) => {
  try {
    const userId = String(req.body?.user_id || '')
    const token = String(req.body?.token || '')
    if (!userId || !token) return res.status(400).json({ error: 'user_id and token required' })
    savePushToken(userId, token)
    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'push register failed',
    })
  }
})

/** Speech → text via Groq/OpenAI Whisper (+ optional LLM polish). */
app.post('/api/ai/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: 'audio file required (field: audio)' })
    }
    const language = String(req.body?.language || req.query.language || '') || null
    const provider = resolveProvider()
    const result = await transcribeAudio({
      buffer: file.buffer,
      filename: file.originalname || 'voice.m4a',
      mimeType: file.mimetype,
      language,
      groqKey,
      openaiKey,
      polishClient: provider?.client || null,
      polishModel: provider?.model || null,
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
    const context = buildContext(input)
    const today = input.current_date || new Date().toISOString().slice(0, 10)
    const provider = resolveProvider()

    if (!provider) {
      const local = localAI(input.message, input.tasks, today)
      return res.json({ ...local, provider: 'local' })
    }

    try {
      const completion = await provider.client.chat.completions.create({
        model: provider.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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
      return res.json({ ...json, provider: provider.name })
    } catch (providerError) {
      console.warn(`${provider.name} unavailable, using local AI:`, providerError)
      const local = localAI(input.message, input.tasks, today)
      return res.json({ ...local, fallback: true, provider: 'local' })
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

  // Poll connected users who registered a push token (~every 10 min).
  // Free Render may sleep — alerts also fire when the app opens Home.
  const POLL_MS = 10 * 60 * 1000
  setInterval(() => {
    pollMeetingPushes().catch((e) => console.warn('meeting poll', e))
  }, POLL_MS)
  setTimeout(() => {
    pollMeetingPushes().catch(() => undefined)
  }, 45_000)
})

async function pollMeetingPushes() {
  const users = listPushUsers()
  if (!users.length) return
  const provider = resolveProvider()
  for (const userId of users) {
    const token = getPushToken(userId)
    if (!token) continue
    const conn = await getConnection(userId)
    if (!conn) continue
    try {
      const messages = await listRecentInboxMessages(userId, { hours: 48, max: 25 })
      const digest = await buildMeetingsDigest({
        messages,
        email: conn.email,
        hours: 48,
        provider: provider ? { client: provider.client, model: provider.model } : null,
      })
      for (const m of digest.meetings) {
        if (wasAlertPushed(userId, m.id)) continue
        const ok = await sendExpoPush({
          token,
          title: 'Wahrly · Inbox',
          body: m.notifyBody,
          data: { kind: 'meeting', alertId: m.id, messageId: m.messageId },
        })
        if (ok) markAlertPushed(userId, m.id)
      }
    } catch (e) {
      console.warn('meeting poll user', userId, e)
    }
  }
}
