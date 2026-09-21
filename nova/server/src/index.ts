import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { z } from 'zod'
import { buildDigest, demoDigest } from './email/digest.js'
import { demoCalendarEvents, listCalendarEvents, createCalendarEvent } from './email/calendar.js'
import {
  buildAuthUrl,
  exchangeCode,
  gmailConfigured,
  resolveAppReturnUrl,
  listOvernightMessages,
  listRecentInboxMessages,
  listRecentSentMessages,
  parseOAuthState,
  sendGmailMessage,
  createGmailDraft,
} from './email/gmail.js'
import {
  enqueueGmailUser,
  friendlyGmailError,
  gmailCacheKey,
  isGmailQuotaError,
  withGmailCache,
} from './email/gmailGuard.js'
import { buildMeetingsDigest, demoMeetings } from './email/meetings.js'
import { buildPromisesDigest, demoPromises } from './email/promises.js'
import {
  getPushToken,
  hydratePushTokensFromSupabase,
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
  // Kept for legacy / optional replay hints; return client is signed into OAuth state
  oauthNonces.set(nonce, { userId, client, expires: Date.now() + 15 * 60 * 1000 })
  const url = buildAuthUrl(userId, nonce, client)
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
  const client = parsed?.client || 'web'
  const appUrl = resolveAppReturnUrl(client)

  const fail = () => res.redirect(`${appUrl}settings?gmail=error`)

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
      provider: 'gmail',
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || existing?.refreshToken || '',
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
    const force = String(req.query.refresh || '') === '1'
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

    const cacheKey = gmailCacheKey(userId, 'digest', timeZone || 'local')
    const digest = await enqueueGmailUser(userId, () =>
      withGmailCache(
        cacheKey,
        async () => {
          const messages = await listOvernightMessages(userId, { timeZone, max: 18 })
          const provider = resolveProvider()
          return buildDigest({
            messages,
            email: conn.email,
            timeZone,
            provider: provider ? { client: provider.client, model: provider.model } : null,
          })
        },
        { force },
      ),
    )
    return res.json(digest)
  } catch (error) {
    console.error('digest', error)
    const status = isGmailQuotaError(error) ? 429 : 500
    return res.status(status).json({
      error: friendlyGmailError(error, 'Couldn’t load yesterday’s inbox'),
    })
  }
})

app.get('/api/email/promises', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    const allowDemo = String(req.query.demo || '') === '1'
    const days = Number(req.query.days || 7)
    const force = String(req.query.refresh || '') === '1'
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

    const safeDays = Number.isFinite(days) ? days : 7
    const cacheKey = gmailCacheKey(userId, 'promises', String(safeDays))
    const digest = await enqueueGmailUser(userId, () =>
      withGmailCache(
        cacheKey,
        async () => {
          const messages = await listRecentSentMessages(userId, { days: safeDays, max: 12 })
          const provider = resolveProvider()
          return buildPromisesDigest({
            messages,
            email: conn.email,
            days: safeDays,
            provider: provider ? { client: provider.client, model: provider.model } : null,
          })
        },
        { force },
      ),
    )
    return res.json(digest)
  } catch (error) {
    console.error('promises', error)
    const status = isGmailQuotaError(error) ? 429 : 500
    return res.status(status).json({
      error: friendlyGmailError(error, 'Couldn’t scan sent mail'),
    })
  }
})

/** Scan recent Primary inbox for meet / call / report asks. */
app.get('/api/email/meetings', async (req, res) => {
  try {
    const userId = String(req.query.user_id || '')
    const allowDemo = String(req.query.demo || '') === '1'
    const hours = Number(req.query.hours || 48)
    const force = String(req.query.refresh || '') === '1'
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
    const cacheKey = gmailCacheKey(userId, 'meetings', String(safeHours))
    const digest = await enqueueGmailUser(userId, () =>
      withGmailCache(
        cacheKey,
        async () => {
          const messages = await listRecentInboxMessages(userId, {
            hours: safeHours,
            max: 12,
          })
          const provider = resolveProvider()
          return buildMeetingsDigest({
            messages,
            email: conn.email,
            hours: safeHours,
            provider: provider ? { client: provider.client, model: provider.model } : null,
          })
        },
        { force },
      ),
    )
    return res.json(digest)
  } catch (error) {
    console.error('meetings', error)
    const status = isGmailQuotaError(error) ? 429 : 500
    return res.status(status).json({
      error: friendlyGmailError(error, 'Couldn’t scan inbox asks'),
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

/** Create a Google Calendar event on the primary calendar. */
app.post('/api/calendar/events', async (req, res) => {
  try {
    const userId = String(req.body?.user_id || '')
    const title = String(req.body?.title || '').trim()
    const start = String(req.body?.start || '')
    const end = String(req.body?.end || '')
    const location = req.body?.location ? String(req.body.location) : null
    const description = req.body?.description ? String(req.body.description) : null
    const allDay = Boolean(req.body?.allDay)
    if (!userId || !title || !start || !end) {
      return res.status(400).json({ error: 'user_id, title, start, end required' })
    }
    const event = await createCalendarEvent(userId, {
      title,
      start,
      end,
      allDay,
      location,
      description,
    })
    return res.json({ ok: true, event })
  } catch (error) {
    console.error('calendar create', error)
    const msg = error instanceof Error ? error.message : 'calendar create failed'
    const needsReconnect = /permission missing|reconnect/i.test(msg)
    return res.status(needsReconnect ? 403 : 500).json({ error: msg })
  }
})

/** Send a Gmail reply as the connected user. */
app.post('/api/email/send', async (req, res) => {
  try {
    const userId = String(req.body?.user_id || '')
    const to = String(req.body?.to || '').trim()
    const subject = String(req.body?.subject || '').trim()
    const body = String(req.body?.body || '')
    const threadId = req.body?.thread_id ? String(req.body.thread_id) : null
    if (!userId || !to || !subject || !body.trim()) {
      return res.status(400).json({ error: 'user_id, to, subject, body required' })
    }
    const result = await sendGmailMessage(userId, { to, subject, body, threadId })
    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('email send', error)
    const msg = error instanceof Error ? error.message : 'send failed'
    const needsReconnect = /permission missing|reconnect/i.test(msg)
    return res.status(needsReconnect ? 403 : 500).json({ error: msg })
  }
})

/** Create a Gmail draft (does not send). */
app.post('/api/email/draft', async (req, res) => {
  try {
    const userId = String(req.body?.user_id || '')
    const to = String(req.body?.to || '').trim()
    const subject = String(req.body?.subject || '').trim()
    const body = String(req.body?.body || '')
    const threadId = req.body?.thread_id ? String(req.body.thread_id) : null
    if (!userId || !to || !subject || !body.trim()) {
      return res.status(400).json({ error: 'user_id, to, subject, body required' })
    }
    const result = await createGmailDraft(userId, { to, subject, body, threadId })
    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('email draft', error)
    const msg = error instanceof Error ? error.message : 'draft failed'
    const needsReconnect = /permission missing|reconnect/i.test(msg)
    return res.status(needsReconnect ? 403 : 500).json({ error: msg })
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
    const context = buildContext(input)
    const today = input.current_date || new Date().toISOString().slice(0, 10)
    const provider = resolveProvider()

    if (!provider) {
      const local = localAI(input.message, input.tasks, today, input.bills)
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
      const local = localAI(input.message, input.tasks, today, input.bills)
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

  hydratePushTokensFromSupabase().catch(() => undefined)

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
      const cacheKey = gmailCacheKey(userId, 'meetings', '48')
      const digest = await enqueueGmailUser(userId, () =>
        withGmailCache(cacheKey, async () => {
          const messages = await listRecentInboxMessages(userId, { hours: 48, max: 12 })
          return buildMeetingsDigest({
            messages,
            email: conn.email,
            hours: 48,
            provider: provider ? { client: provider.client, model: provider.model } : null,
          })
        }),
      )
      for (const m of digest.meetings) {
        if (wasAlertPushed(userId, m.id)) continue
        const ok = await sendExpoPush({
          token,
          title: 'Wahrly · Inbox',
          body: m.notifyBody,
          data: {
            kind: 'meeting',
            alertId: m.id,
            messageId: m.messageId,
            route: '/home',
          },
        })
        if (ok) markAlertPushed(userId, m.id)
      }
    } catch (e) {
      console.warn('meeting poll user', userId, e)
    }
  }
}
