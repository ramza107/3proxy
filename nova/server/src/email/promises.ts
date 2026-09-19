import type OpenAI from 'openai'
import type { SentMessagePreview } from './gmail.js'

export type EmailPromise = {
  id: string
  messageId: string
  toName: string
  toEmail: string
  subject: string
  /** Short quote / commitment in the user's words */
  promise: string
  /** Ready-to-create task title */
  suggestedTask: string
  suggestedDate: string | null
  sentAt: string
}

export type PromisesDigest = {
  connected: boolean
  email: string | null
  demo: boolean
  summary: string
  promises: EmailPromise[]
  scanned: number
  generatedAt: string
  days: number
}

function hashId(parts: string[]) {
  const raw = parts.join('|')
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0
  return `prm_${h.toString(16)}`
}

function cleanQuote(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160)
}

function firstNameFromEmail(email: string, name: string) {
  if (name && !name.includes('@')) return name.split(/\s+/)[0]
  return email.split('@')[0] || 'them'
}

/** Heuristic commitment extractor (EN + RU) — works offline without AI. */
export function extractPromisesLocal(messages: SentMessagePreview[], today: string): EmailPromise[] {
  const out: EmailPromise[] = []
  const seen = new Set<string>()

  const patterns: RegExp[] = [
    /\bI(?:['’]ll| will)\s+(?:send|get|call|reply|review|finish|do|check|share|follow up|update|pay|book|return)[^.!?\n]{0,80}/gi,
    /\bI(?:['’]m| am)\s+(?:going to|gonna)\s+[^.!?\n]{0,80}/gi,
    /\bI(?:['’]ll| will)\s+get back to you[^.!?\n]{0,40}/gi,
    /\blet me\s+(?:send|check|get back|follow up)[^.!?\n]{0,60}/gi,
    /я\s+(?:пришлю|отправлю|сделаю|отвечу|проверю|перезвоню|вернусь|дошлю|скину)[^.!?\n]{0,80}/gi,
    /я\s+(?:обязательно|точно)\s+[^.!?\n]{0,60}/gi,
  ]

  for (const msg of messages) {
    const blob = `${msg.subject}\n${msg.snippet}\n${msg.bodyText}`.slice(0, 4000)
    for (const re of patterns) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(blob)) !== null) {
        const promise = cleanQuote(m[0])
        if (promise.length < 8) continue
        const key = `${msg.id}:${promise.toLowerCase().slice(0, 40)}`
        if (seen.has(key)) continue
        seen.add(key)

        const toName = firstNameFromEmail(msg.toEmail, msg.toName)
        const suggestedTask = buildTaskTitle(promise, toName, msg.subject)
        const suggestedDate = guessDate(promise, today) || guessDate(blob, today)

        out.push({
          id: hashId([msg.id, promise]),
          messageId: msg.id,
          toName: msg.toName || toName,
          toEmail: msg.toEmail,
          subject: msg.subject,
          promise,
          suggestedTask,
          suggestedDate,
          sentAt: msg.date,
        })
        if (out.length >= 8) return out
      }
    }
  }
  return out
}

function buildTaskTitle(promise: string, toName: string, subject: string) {
  const p = promise.replace(/^(I(?:['’]ll| will)|I'm going to|I am going to|я)\s+/i, '').trim()
  const short = p.slice(0, 70)
  if (/get back|вернусь|отвеч/i.test(promise)) {
    return `Follow up with ${toName}${subject ? ` (${subject.slice(0, 40)})` : ''}`
  }
  if (short.length > 4) {
    return short.charAt(0).toUpperCase() + short.slice(1)
  }
  return `Promise to ${toName}: ${subject.slice(0, 50)}`
}

function guessDate(text: string, today: string): string | null {
  const lower = text.toLowerCase()
  const addDays = (n: number) => {
    const d = new Date(`${today}T12:00:00`)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  if (/\btoday\b|сегодня/.test(lower)) return today
  if (/\btomorrow\b|завтра/.test(lower)) return addDays(1)
  if (/\bby friday\b|к пятниц/.test(lower)) {
    const d = new Date(`${today}T12:00:00`)
    const day = d.getDay()
    const delta = (5 - day + 7) % 7 || 7
    return addDays(delta)
  }
  if (/\bnext week\b|на следующей неделе/.test(lower)) return addDays(7)
  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/) || lower.match(/через\s+(\d+)\s+дн/)
  if (inDays) return addDays(Number(inDays[1]))
  return null
}

export async function extractPromisesWithAI(
  messages: SentMessagePreview[],
  provider: { client: OpenAI; model: string } | null,
  today: string,
): Promise<EmailPromise[]> {
  const local = extractPromisesLocal(messages, today)
  if (!provider || messages.length === 0) return local

  const lines = messages
    .slice(0, 12)
    .map((m, i) => {
      const body = (m.bodyText || m.snippet || '').replace(/\s+/g, ' ').slice(0, 500)
      return `[${i}] id=${m.id} to=${m.toName} <${m.toEmail}> subject=${m.subject} sent=${m.date}\n${body}`
    })
    .join('\n\n')

  try {
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You find OPEN LOOPS: commitments the USER made in their own SENT emails (promises to do something later). Ignore polite fluff and calendar invites.
Return JSON: { "promises": [ { "messageId": "...", "promise": "short quote", "suggestedTask": "actionable task title", "suggestedDate": "YYYY-MM-DD or null", "toName": "..." } ] }
Max 5 items. Only real commitments (I'll send / I'll reply / я пришлю / я сделаю). Today is ${today}.`,
        },
        { role: 'user', content: lines },
      ],
    })
    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw) as {
      promises?: {
        messageId?: string
        promise?: string
        suggestedTask?: string
        suggestedDate?: string | null
        toName?: string
      }[]
    }
    const list = Array.isArray(parsed.promises) ? parsed.promises : []
    if (!list.length) return local

    const byId = new Map(messages.map((m) => [m.id, m]))
    const aiOut: EmailPromise[] = []
    for (const row of list.slice(0, 5)) {
      const msg = byId.get(String(row.messageId || ''))
      if (!msg || !row.promise || !row.suggestedTask) continue
      const promise = cleanQuote(row.promise)
      aiOut.push({
        id: hashId([msg.id, promise]),
        messageId: msg.id,
        toName: row.toName || msg.toName,
        toEmail: msg.toEmail,
        subject: msg.subject,
        promise,
        suggestedTask: String(row.suggestedTask).slice(0, 120),
        suggestedDate: row.suggestedDate || null,
        sentAt: msg.date,
      })
    }
    return aiOut.length ? aiOut : local
  } catch {
    return local
  }
}

export function demoPromises(): PromisesDigest {
  const today = new Date().toISOString().slice(0, 10)
  const add = (n: number) => {
    const d = new Date(`${today}T12:00:00`)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  return {
    connected: false,
    email: null,
    demo: true,
    summary: 'Demo: Wahrly found 2 promises in your sent mail — Gmail never turns these into tasks.',
    promises: [
      {
        id: 'demo_1',
        messageId: 'demo',
        toName: 'Alex',
        toEmail: 'alex@work.example',
        subject: 'Re: Q3 deck',
        promise: "I'll send the updated slides tomorrow",
        suggestedTask: 'Send updated Q3 slides to Alex',
        suggestedDate: add(1),
        sentAt: new Date().toISOString(),
      },
      {
        id: 'demo_2',
        messageId: 'demo2',
        toName: 'Mom',
        toEmail: 'mom@example.com',
        subject: 'Sunday',
        promise: 'Я перезвоню вечером',
        suggestedTask: 'Call Mom back this evening',
        suggestedDate: today,
        sentAt: new Date().toISOString(),
      },
    ],
    scanned: 6,
    generatedAt: new Date().toISOString(),
    days: 7,
  }
}

export async function buildPromisesDigest(params: {
  messages: SentMessagePreview[]
  email: string
  provider: { client: OpenAI; model: string } | null
  days: number
}): Promise<PromisesDigest> {
  const today = new Date().toISOString().slice(0, 10)
  const promises = await extractPromisesWithAI(params.messages, params.provider, today)
  const summary = promises.length
    ? `You made ${promises.length} open promise${promises.length > 1 ? 's' : ''} in the last ${params.days} days — turn them into tasks before they slip.`
    : `No clear promises in your last ${params.days} days of sent mail. Nice — inbox guilt stays low.`

  return {
    connected: true,
    email: params.email,
    demo: false,
    summary,
    promises,
    scanned: params.messages.length,
    generatedAt: new Date().toISOString(),
    days: params.days,
  }
}
