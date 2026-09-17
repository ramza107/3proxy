import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'
import { z } from 'zod'
import { localAI } from './localAI.js'
import { SYSTEM_PROMPT } from './prompt.js'

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname })
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const Port = Number(process.env.PORT || 8787)
const openaiKey = process.env.OPENAI_API_KEY || ''
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

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
  res.json({
    ok: true,
    openai: Boolean(openaiKey && !openaiKey.includes('your-openai')),
  })
})

app.post('/api/ai/chat', async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() })
    }

    const input = parsed.data
    const context = buildContext(input)

    if (!openaiKey || openaiKey.includes('your-openai')) {
      const local = localAI(input.message, input.tasks, input.current_date || new Date().toISOString().slice(0, 10))
      return res.json(local)
    }

    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const completion = await openai.chat.completions.create({
        model,
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
      return res.json(json)
    } catch (openaiError) {
      console.warn('OpenAI unavailable, using local AI:', openaiError)
      const local = localAI(
        input.message,
        input.tasks,
        input.current_date || new Date().toISOString().slice(0, 10),
      )
      return res.json({ ...local, fallback: true })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI failed',
    })
  }
})

app.listen(Port, () => {
  console.log(`NOVA AI server listening on http://localhost:${Port}`)
})
