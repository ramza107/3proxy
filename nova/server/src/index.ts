import cors from 'cors'
import crypto from 'crypto'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'
import { z } from 'zod'
import { buildDigest, demoDigest } from './email/digest.js'
import {
  buildAuthUrl,
  exchangeCode,
  gmailConfigured,
  getAppReturnUrl,
  listOvernightMessages,
  parseOAuthState,
} from './email/gmail.js'
import { listOvernightViaImap, saveImapConnection } from './email/imap.js'
import { deleteConnection, getConnection, saveConnection } from './email/store.js'
import { localAI } from './localAI.js'
import { SYSTEM_PROMPT } from './prompt.js'

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname })
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const Port = Number(process.env.PORT || 8787)
/** Short-lived OAuth CSRF nonces: nonce → userId */
const oauthNonces = new Map<string, { userId: string; expires: number }>()

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
    gmail_imap: true,
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
  const nonce = crypto.randomBytes(16).toString('hex')
  oauthNonces.set(nonce, { userId, expires: Date.now() + 10 * 60 * 1000 })
  const url = buildAuthUrl(userId, nonce)
  // JSON for clients that prefer to open the URL themselves
  if (String(req.query.format || '') === 'json' || req.accepts('json') === 'json' && !req.accepts('html')) {
    return res.json({ url })
  }
  return res.redirect(url)
})

app.get('/api/email/callback', async (req, res) => {
  const appUrl = getAppReturnUrl().replace(/\/?$/, '/')
  try {
    const code = String(req.query.code || '')
    const state = String(req.query.state || '')
    const parsed = parseOAuthState(state)
    if (!code || !parsed) {
      return res.redirect(`${appUrl}settings?gmail=error`)
    }
    const nonceRow = oauthNonces.get(parsed.nonce)
    oauthNonces.delete(parsed.nonce)
    if (!nonceRow || nonceRow.userId !== parsed.userId || nonceRow.expires < Date.now()) {
      return res.redirect(`${appUrl}settings?gmail=error`)
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
    return res.redirect(`${appUrl}settings?gmail=error`)
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

app.post('/api/email/connect-imap', async (req, res) => {
  try {
    const schema = z.object({
      user_id: z.string().min(1),
      email: z.string().email(),
      app_password: z.string().min(8),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Need user_id, Gmail address, and App Password',
        details: parsed.error.flatten(),
      })
    }
    const { user_id, email, app_password } = parsed.data
    const conn = await saveImapConnection(user_id, email, app_password)
    return res.json({
      ok: true,
      connected: true,
      email: conn.email,
      provider: conn.provider,
    })
  } catch (error) {
    console.error('connect-imap', error)
    const anyErr = error as {
      message?: string
      responseText?: string
      authenticationFailed?: boolean
      response?: string
    }
    const message =
      anyErr.responseText ||
      anyErr.message ||
      (typeof error === 'string' ? error : 'IMAP connect failed')
    const authFail =
      anyErr.authenticationFailed ||
      /Invalid credentials|AUTHENTICATIONFAILED|Application-specific password|LOGIN/i.test(
        String(anyErr.response || '') + message,
      )
    const hint = authFail
      ? 'Wrong password. Use a Google App Password (16 characters), not your normal Gmail password. Open myaccount.google.com/apppasswords'
      : undefined
    return res.status(401).json({
      error: hint || message,
      hint,
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

    const messages =
      conn.provider === 'gmail_imap'
        ? await listOvernightViaImap(userId, { timeZone })
        : await listOvernightMessages(userId, { timeZone })
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
})
