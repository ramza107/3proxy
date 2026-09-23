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
  /** Optional draft follow-up body */
  suggestedReply?: string | null
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

/** Soft / empty commitments that should not become tasks. */
const FALSE_POSITIVE =
  /^(?:I(?:['’]ll| will)\s+(?:let you know|keep you posted|be in touch|circle back(?:\s+soon)?|get back(?:\s+to you)?(?:\s+soon)?|think about it|see|try|do my best)\.?|я\s+(?:дам знать|напишу позже|подумаю|посмотрю|постараюсь)\.?)$/i

const WEAK_VERB_ONLY =
  /^(?:I(?:['’]ll| will)|I'm going to|I am going to|я)\s+(?:do|check|see|try|look|send|reply|call)\.?$/i

/** Heuristic commitment extractor (EN + RU) — works offline without AI. */
export function extractPromisesLocal(messages: SentMessagePreview[], today: string): EmailPromise[] {
  const out: EmailPromise[] = []
  const seenQuote = new Set<string>()
  const seenDedupe = new Set<string>()

  const patterns: RegExp[] = [
    /\bI(?:['’]ll| will)\s+(?:send|get|call|reply|review|finish|do|check|share|follow up|update|pay|book|return|prepare|deliver|forward|schedule|confirm|bring|fix|write|draft|upload|submit)[^.!?\n]{0,80}/gi,
    /\bI(?:['’]m| am)\s+(?:going to|gonna)\s+(?:send|get|call|reply|review|finish|do|check|share|follow up|update|pay|book|return|prepare|deliver)[^.!?\n]{0,80}/gi,
    /\blet me\s+(?:send|check|get back|follow up|prepare|share|forward)[^.!?\n]{0,60}/gi,
    /я\s+(?:пришлю|отправлю|сделаю|отвечу|проверю|перезвоню|вернусь|дошлю|скину|подготовлю|согласую|оплачу|забронирую|напишу|исправлю|доделаю)[^.!?\n]{0,80}/gi,
    /я\s+(?:обязательно|точно)\s+(?:пришлю|отправлю|сделаю|отвечу|проверю|перезвоню|вернусь|дошлю|скину|подготовлю)[^.!?\n]{0,60}/gi,
  ]

  for (const msg of messages) {
    const blob = `${msg.subject}\n${msg.snippet}\n${msg.bodyText}`.slice(0, 4000)
    for (const re of patterns) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(blob)) !== null) {
        const promise = cleanQuote(m[0])
        if (promise.length < 10) continue
        if (FALSE_POSITIVE.test(promise) || WEAK_VERB_ONLY.test(promise)) continue
        const quoteKey = `${msg.id}:${promise.toLowerCase().slice(0, 40)}`
        if (seenQuote.has(quoteKey)) continue
        seenQuote.add(quoteKey)

        const toName = firstNameFromEmail(msg.toEmail, msg.toName)
        const suggestedTask = buildTaskTitle(promise, toName, msg.subject)
        const suggestedDate = guessDate(promise, today) || guessDate(blob, today)
        const dedupeKey = normalizeDedupe(suggestedTask, msg.toEmail)
        if (seenDedupe.has(dedupeKey)) continue
        seenDedupe.add(dedupeKey)

        out.push({
          id: hashId([msg.id, promise]),
          messageId: msg.id,
          toName: msg.toName || toName,
          toEmail: msg.toEmail,
          subject: msg.subject,
          promise,
          suggestedTask,
          suggestedDate,
          suggestedReply: `Hi ${toName},\n\nJust a quick note — I'm on track for: ${suggestedTask}${suggestedDate ? ` by ${suggestedDate}` : ''}.\n\nBest`,
          sentAt: msg.date,
        })
        if (out.length >= 8) return out
      }
    }
  }
  return out
}

function normalizeDedupe(task: string, toEmail: string) {
  // Collapse near-duplicates: "Send the deck tomorrow" ≈ "Send the updated deck".
  const stop = new Set([
    'the', 'a', 'an', 'to', 'for', 'with', 'by', 'on', 'in', 'of', 'and', 'or',
    'today', 'tomorrow', 'tonight', 'this', 'next', 'updated', 'new',
    'сегодня', 'завтра', 'вечером', 'этот', 'эту', 'следующей',
  ])
  const words = task
    .toLowerCase()
    .replace(/[^a-z0-9а-яёіїєґ\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w && !stop.has(w) && !/^\d+$/.test(w))
  const core = words.slice(0, 3).join(' ')
  return `${(toEmail || '').toLowerCase()}|${core}`
}

function buildTaskTitle(promise: string, toName: string, subject: string) {
  const p = promise
    .replace(/^(I(?:['’]ll| will)|I'm going to|I am going to|Let me|я(?:\s+(?:обязательно|точно))?)\s+/i, '')
    .trim()
  const short = p.slice(0, 70)
  if (/get back|вернусь|отвеч/i.test(promise)) {
    return `Follow up with ${toName}${subject ? ` (${subject.slice(0, 40)})` : ''}`
  }
  if (short.length > 4) {
    return short.charAt(0).toUpperCase() + short.slice(1)
  }
  return `Promise to ${toName}: ${subject.slice(0, 50)}`
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  воскресенье: 0,
  понедельник: 1,
  вторник: 2,
  среда: 3,
  среду: 3,
  четверг: 4,
  пятница: 5,
  пятницу: 5,
  суббота: 6,
  субботу: 6,
}

export function guessDate(text: string, today: string): string | null {
  const lower = text.toLowerCase()
  const addDays = (n: number) => {
    const d = new Date(`${today}T12:00:00`)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  if (/\btoday\b|сегодня|сьогодні/.test(lower)) return today
  if (/\btomorrow\b|завтра/.test(lower)) return addDays(1)
  if (/\bday after tomorrow\b|послезавтра|післязавтра/.test(lower)) return addDays(2)

  const byWeekday = lower.match(
    /\b(?:by|on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|(?:к|до|в|у)\s+(понедельник|вторник|среду|среда|четверг|пятницу|пятница|субботу|суббота|воскресенье)/,
  )
  if (byWeekday) {
    const token = (byWeekday[1] || byWeekday[2] || byWeekday[3] || '')
      .replace(/у$/, 'а')
      .replace(/^среда$/, 'среда')
    const normalized =
      token === 'среда' || token === 'среду'
        ? 'среда'
        : token === 'пятница' || token === 'пятницу'
          ? 'пятница'
          : token === 'суббота' || token === 'субботу'
            ? 'суббота'
            : token
    const target = WEEKDAYS[normalized] ?? WEEKDAYS[token]
    if (target != null) {
      const d = new Date(`${today}T12:00:00`)
      const day = d.getDay()
      let delta = (target - day + 7) % 7
      if (delta === 0) delta = 7
      if (/\bnext\b|следующ|наступн/.test(lower) && delta <= 7) delta += 7
      return addDays(delta)
    }
  }

  if (/\bby friday\b|к пятниц/.test(lower)) {
    const d = new Date(`${today}T12:00:00`)
    const day = d.getDay()
    const delta = (5 - day + 7) % 7 || 7
    return addDays(delta)
  }
  if (/\bnext week\b|на следующей неделе|на наступному тижні/.test(lower)) return addDays(7)
  if (/\bend of (?:the )?week\b|к концу недели|до кінця тижня/.test(lower)) {
    const d = new Date(`${today}T12:00:00`)
    const day = d.getDay()
    const delta = day === 0 ? 0 : 7 - day
    return addDays(delta || 7)
  }

  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/) || lower.match(/через\s+(\d+)\s+дн/)
  if (inDays) return addDays(Number(inDays[1]))

  // ISO or European numeric dates
  const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = lower.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](20\d{2}|\d{2}))?\b/)
  if (dmy) {
    const base = new Date(`${today}T12:00:00`)
    const day = Number(dmy[1])
    const month = Number(dmy[2]) - 1
    let year = dmy[3]
      ? Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3])
      : base.getFullYear()
    let candidate = new Date(year, month, day, 12)
    if (!dmy[3] && candidate.getTime() + 86400000 < base.getTime()) {
      candidate = new Date(year + 1, month, day, 12)
    }
    if (candidate.getDate() === day) return candidate.toISOString().slice(0, 10)
  }

  const months: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
    января: 0,
    февраля: 1,
    марта: 2,
    апреля: 3,
    мая: 4,
    июня: 5,
    июля: 6,
    августа: 7,
    сентября: 8,
    октября: 9,
    ноября: 10,
    декабря: 11,
  }
  const mdy = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/,
  )
  const dmon = lower.match(
    /\b(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b/,
  )
  if (mdy || dmon) {
    const base = new Date(`${today}T12:00:00`)
    const monthName = mdy ? mdy[1] : dmon![2]
    const dayNum = mdy ? Number(mdy[2]) : Number(dmon![1])
    const candidate = new Date(base.getFullYear(), months[monthName], dayNum, 12)
    if (candidate.getTime() + 86400000 < base.getTime()) {
      candidate.setFullYear(candidate.getFullYear() + 1)
    }
    return candidate.toISOString().slice(0, 10)
  }

  return null
}

function dedupePromises(list: EmailPromise[]): EmailPromise[] {
  const seen = new Set<string>()
  const out: EmailPromise[] = []
  for (const p of list) {
    const key = normalizeDedupe(p.suggestedTask, p.toEmail)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
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
          content: `You find OPEN LOOPS: concrete commitments the USER made in their own SENT emails (promises to do a specific thing later).
Ignore polite fluff ("I'll let you know", "I'll keep you posted", "I'll think about it", "I'll try", signatures, calendar invites, auto-replies).
Prefer actionable verbs with an object (send X, call Y, finish the deck).
Suggest a due date when the email mentions one (today/tomorrow/by Friday/понедельник/15.03 → YYYY-MM-DD). Today is ${today}.
Return JSON: { "promises": [ { "messageId": "...", "promise": "short quote", "suggestedTask": "actionable task title", "suggestedDate": "YYYY-MM-DD or null", "toName": "..." } ] }
Max 5 items. Deduplicate similar promises to the same recipient.`,
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
      if (FALSE_POSITIVE.test(promise)) continue
      const suggestedDate =
        (row.suggestedDate && /^\d{4}-\d{2}-\d{2}$/.test(row.suggestedDate)
          ? row.suggestedDate
          : null) ||
        guessDate(promise, today) ||
        guessDate(`${msg.subject} ${msg.bodyText || msg.snippet || ''}`, today)
      aiOut.push({
        id: hashId([msg.id, promise]),
        messageId: msg.id,
        toName: row.toName || msg.toName,
        toEmail: msg.toEmail,
        subject: msg.subject,
        promise,
        suggestedTask: String(row.suggestedTask).slice(0, 120),
        suggestedDate,
        sentAt: msg.date,
      })
    }
    // Prefer AI when it found real items; merge local extras that AI missed (deduped).
    return dedupePromises([...aiOut, ...local]).slice(0, 5)
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
        suggestedReply:
          "Hi Alex,\n\nJust a quick note — I'm on track for: Send updated Q3 slides to Alex.\n\nBest",
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
        suggestedReply:
          "Hi Mom,\n\nJust a quick note — I'm on track for: Call Mom back this evening.\n\nBest",
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
