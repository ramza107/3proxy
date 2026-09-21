import type OpenAI from 'openai'
import type { InboxMessagePreview } from './gmail.js'

export type MeetingAlert = {
  id: string
  messageId: string
  fromName: string
  fromEmail: string
  subject: string
  /** What they want: meet, report, call, etc. */
  intent: 'meet' | 'report' | 'call' | 'other'
  /** Human summary for push + UI */
  summary: string
  /** Push notification body */
  notifyBody: string
  suggestedDate: string | null
  suggestedTime: string | null
  /** Optional draft reply body (client can also generate) */
  suggestedReply?: string | null
  receivedAt: string
}

export type MeetingsDigest = {
  connected: boolean
  email: string | null
  demo: boolean
  summary: string
  meetings: MeetingAlert[]
  scanned: number
  generatedAt: string
  hours: number
}

function hashId(parts: string[]) {
  const raw = parts.join('|')
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) >>> 0
  return `mtg_${h.toString(16)}`
}

function clean(text: string, max = 180) {
  return text.replace(/\s+/g, ' ').trim().slice(0, max)
}

function firstName(email: string, name: string) {
  if (name && !name.includes('@')) return name.split(/\s+/)[0]
  return email.split('@')[0] || 'Someone'
}

function guessDateTime(
  text: string,
  today: string,
): { date: string | null; time: string | null } {
  const lower = text.toLowerCase()
  const addDays = (n: number) => {
    const d = new Date(`${today}T12:00:00`)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  let date: string | null = null
  if (/\btoday\b|сегодня/.test(lower)) date = today
  else if (/\btomorrow\b|завтра/.test(lower)) date = addDays(1)
  else {
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
    }
    const mdy = lower.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/,
    )
    if (mdy) {
      const base = new Date(`${today}T12:00:00`)
      const candidate = new Date(base.getFullYear(), months[mdy[1]], Number(mdy[2]), 12)
      if (candidate.getTime() + 86400000 < base.getTime()) {
        candidate.setFullYear(candidate.getFullYear() + 1)
      }
      date = candidate.toISOString().slice(0, 10)
    }
  }
  const timeMatch =
    lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ||
    lower.match(/\b(\d{1,2}):(\d{2})\b/) ||
    lower.match(/\bв\s+(\d{1,2})(?::(\d{2}))?\b/)
  let time: string | null = null
  if (timeMatch) {
    let h = Number(timeMatch[1])
    const m = Number(timeMatch[2] || 0)
    const ap = (timeMatch[3] || '').toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
  return { date, time }
}

/** Local heuristic — EN + RU meeting / report / call requests. */
export function extractMeetingsLocal(
  messages: InboxMessagePreview[],
  today: string,
): MeetingAlert[] {
  const out: MeetingAlert[] = []
  const seen = new Set<string>()

  const meetRe =
    /\b(?:meet|meeting|catch up|see you|get together|coffee|lunch|dinner|call me|let'?s talk|zoom|teams|facetime|hangouts)\b|увид|встреч|созвон|давай\s+(?:созвоним|встретимся)|хочу\s+увидеть|wanna\s+meet|want to meet|i wanna meet/i
  const reportRe =
    /\b(?:report|send me|need the|by tomorrow|due|deadline|please send|can you send)\b|отчет|отчёт|пришли|нужен\s+отчет|к\s+завтра/i
  const callRe = /\b(?:call|phone|ring)\b|перезвон|позвони|созвон/i

  for (const msg of messages) {
    const blob = `${msg.subject}\n${msg.snippet}\n${msg.bodyText}`.slice(0, 4000)
    const isMeet = meetRe.test(blob)
    const isReport = reportRe.test(blob)
    const isCall = callRe.test(blob)
    if (!isMeet && !isReport && !isCall) continue

    const intent: MeetingAlert['intent'] = isMeet
      ? 'meet'
      : isReport
        ? 'report'
        : isCall
          ? 'call'
          : 'other'
    const who = firstName(msg.from, msg.fromName)
    const { date, time } = guessDateTime(blob, today)
    const whenBits = [date, time].filter(Boolean).join(' ')
    let summary = ''
    let notifyBody = ''
    if (intent === 'meet') {
      summary = `${who} wants to meet${whenBits ? ` · ${whenBits}` : ''}`
      notifyBody = `${who} wrote — wants to meet${whenBits ? ` ${whenBits}` : ''}`
    } else if (intent === 'report') {
      summary = `${who} asked for a report / deliverable${whenBits ? ` by ${whenBits}` : ''}`
      notifyBody = `${who} wrote — wants a report${whenBits ? ` by ${whenBits}` : ''}`
    } else {
      summary = `${who} wants a call${whenBits ? ` · ${whenBits}` : ''}`
      notifyBody = `${who} wrote — wants to talk${whenBits ? ` ${whenBits}` : ''}`
    }

    const id = hashId([msg.id, intent, summary])
    if (seen.has(msg.id)) continue
    seen.add(msg.id)

    out.push({
      id,
      messageId: msg.id,
      fromName: msg.fromName || who,
      fromEmail: msg.from,
      subject: msg.subject,
      intent,
      summary: clean(summary),
      notifyBody: clean(notifyBody, 120),
      suggestedDate: date,
      suggestedTime: time,
      suggestedReply:
        intent === 'meet'
          ? `Hi ${who},\n\nThanks — ${whenBits || 'happy to meet'}. Looking forward to it.\n\nBest`
          : intent === 'report'
            ? `Hi ${who},\n\nGot it — I'll send the report${whenBits ? ` by ${whenBits}` : ' soon'}.\n\nBest`
            : `Hi ${who},\n\nHappy to talk${whenBits ? ` · ${whenBits}` : ''}.\n\nBest`,
      receivedAt: msg.date,
    })
    if (out.length >= 8) break
  }
  return out
}

export async function extractMeetingsWithAI(
  messages: InboxMessagePreview[],
  provider: { client: OpenAI; model: string } | null,
  today: string,
): Promise<MeetingAlert[]> {
  const local = extractMeetingsLocal(messages, today)
  if (!provider || messages.length === 0) return local

  const lines = messages
    .slice(0, 15)
    .map((m, i) => {
      const body = (m.bodyText || m.snippet || '').replace(/\s+/g, ' ').slice(0, 450)
      return `[${i}] id=${m.id} from=${m.fromName} <${m.from}> subject=${m.subject} at=${m.date}\n${body}`
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
          content: `You scan INCOMING email for actionable asks: meet / call / send a report or deliverable by a time.
Ignore newsletters, receipts, GitHub bots, marketing.
Return JSON: { "meetings": [ { "messageId": "...", "intent": "meet"|"report"|"call"|"other", "fromName": "...", "summary": "short", "notifyBody": "push text like: Alex wrote — wants to meet tomorrow 6pm", "suggestedDate": "YYYY-MM-DD or null", "suggestedTime": "HH:MM or null" } ] }
Max 5. Today is ${today}. EN and RU.`,
        },
        { role: 'user', content: lines },
      ],
    })
    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw) as {
      meetings?: {
        messageId?: string
        intent?: string
        fromName?: string
        summary?: string
        notifyBody?: string
        suggestedDate?: string | null
        suggestedTime?: string | null
      }[]
    }
    const list = Array.isArray(parsed.meetings) ? parsed.meetings : []
    if (!list.length) return local

    const byId = new Map(messages.map((m) => [m.id, m]))
    const aiOut: MeetingAlert[] = []
    for (const row of list.slice(0, 5)) {
      const msg = byId.get(String(row.messageId || ''))
      if (!msg || !row.summary || !row.notifyBody) continue
      const intent = (['meet', 'report', 'call', 'other'].includes(String(row.intent))
        ? row.intent
        : 'other') as MeetingAlert['intent']
      const who = row.fromName || firstName(msg.from, msg.fromName)
      aiOut.push({
        id: hashId([msg.id, intent, row.summary]),
        messageId: msg.id,
        fromName: who,
        fromEmail: msg.from,
        subject: msg.subject,
        intent,
        summary: clean(row.summary),
        notifyBody: clean(row.notifyBody, 120),
        suggestedDate: row.suggestedDate || null,
        suggestedTime: row.suggestedTime || null,
        receivedAt: msg.date,
      })
    }
    return aiOut.length ? aiOut : local
  } catch {
    return local
  }
}

export function demoMeetings(): MeetingsDigest {
  const today = new Date().toISOString().slice(0, 10)
  const add1 = (() => {
    const d = new Date(`${today}T12:00:00`)
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()
  return {
    connected: false,
    email: null,
    demo: true,
    summary: 'Demo: 2 important asks in your inbox — meet + report.',
    meetings: [
      {
        id: 'demo_mtg_1',
        messageId: 'demo',
        fromName: 'Aaz',
        fromEmail: 'aaz@example.com',
        subject: '11 - i wanna meet with u',
        intent: 'meet',
        summary: 'Aaz wants to meet Sep 23 at 18:00',
        notifyBody: 'Aaz wrote — wants to meet Sep 23 at 6pm',
        suggestedDate: '2026-09-23',
        suggestedTime: '18:00',
        suggestedReply:
          'Hi Aaz,\n\nThanks — Sep 23 at 18:00 works for me. Looking forward to it.\n\nBest',
        receivedAt: new Date().toISOString(),
      },
      {
        id: 'demo_mtg_2',
        messageId: 'demo2',
        fromName: 'Alex',
        fromEmail: 'alex@work.example',
        subject: 'Q3 numbers',
        intent: 'report',
        summary: `Alex asked for the report by tomorrow 10:00`,
        notifyBody: 'Alex wrote — wants the report tomorrow by 10:00',
        suggestedDate: add1,
        suggestedTime: '10:00',
        suggestedReply:
          "Hi Alex,\n\nGot it — I'll send the report by tomorrow 10:00.\n\nBest",
        receivedAt: new Date().toISOString(),
      },
    ],
    scanned: 8,
    generatedAt: new Date().toISOString(),
    hours: 48,
  }
}

export async function buildMeetingsDigest(params: {
  messages: InboxMessagePreview[]
  email: string
  hours: number
  provider: { client: OpenAI; model: string } | null
}): Promise<MeetingsDigest> {
  const today = new Date().toISOString().slice(0, 10)
  const meetings = await extractMeetingsWithAI(params.messages, params.provider, today)
  const summary = meetings.length
    ? `Found ${meetings.length} important ask${meetings.length > 1 ? 's' : ''} in recent inbox (meet / call / report).`
    : `No meeting or report asks in the last ${params.hours}h of Primary inbox.`
  return {
    connected: true,
    email: params.email,
    demo: false,
    summary,
    meetings,
    scanned: params.messages.length,
    generatedAt: new Date().toISOString(),
    hours: params.hours,
  }
}
