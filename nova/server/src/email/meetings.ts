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

/** Strip quoted reply / signature noise so footer keywords don't trigger. */
export function actionableText(msg: Pick<InboxMessagePreview, 'subject' | 'snippet' | 'bodyText'>) {
  let body = msg.bodyText || ''
  body = body.split(
    /\n(?:On .+ wrote:|From:\s|Sent:\s|-----Original Message-----|________________________________|Begin forwarded message)/i,
  )[0]
  body = body
    .split('\n')
    .filter((line) => !/^\s*>/.test(line))
    .join('\n')
  // Prefer subject + snippet + short top of body (asks live up front).
  return clean(`${msg.subject}\n${msg.snippet}\n${body.slice(0, 900)}`, 1400)
}

/** Automated / newsletter / bot senders — never "important asks". */
export function isNoiseSender(fromEmail: string, fromName: string, subject: string) {
  const email = (fromEmail || '').toLowerCase()
  const name = (fromName || '').toLowerCase()
  const sub = (subject || '').toLowerCase()
  const local = email.split('@')[0] || ''
  const domain = email.split('@')[1] || ''

  if (
    /noreply|no-reply|no_reply|donotreply|do-not-reply|notifications?|notify|newsletter|mailer-daemon|bounce|automated|updates?|digest|calendar-notification|invitations?@|docs\.google|drive-shares|comments-noreply|github\.com|gitlab\.com|bitbucket|sentry\.io|stripe\.com|paypal\.com|amazon\.|apple\.com|googlealerts|linkedin\.com|facebookmail|twitter\.com|x\.com|medium\.com|substack\.com|beehiiv|mailchimp|sendgrid|intercom|zendesk|jira|atlassian|notion\.so|slack\.com|discord|figma\.com|dropbox|hubspot|salesforce|mandrill|postmark|sparkpost/.test(
      email,
    )
  ) {
    return true
  }
  if (/^(noreply|no-reply|notifications?|newsletter|mailer|digest|updates?|news)/.test(local)) {
    return true
  }
  if (/newsletter|unsubscribe|weekly digest|daily digest|your receipt|order confirmation|shipping update|password reset|verify your|security alert|new login|sign-in attempt/.test(sub)) {
    return true
  }
  if (/newsletter|digest|notifications?/.test(name)) return true
  // Calendar auto-invites without a personal ask (still shown on Calendar tab).
  if (/invitation:|updated invitation:|canceled event:|accepted:|declined:/.test(sub)) return true
  if (domain.endsWith('.google.com') && /calendar|docs|drive/.test(local)) return true
  return false
}

/**
 * Strong ask patterns only — bare "call"/"due"/"teams"/"see you" are NOT enough.
 * EN + RU. Matched against front-of-message text.
 */
const MEET_ASK =
  /\b(?:(?:can|could|shall)\s+we\s+(?:meet|catch\s+up)|(?:let'?s|lets)\s+(?:meet|catch\s+up|get\s+together)|(?:want|wanna|would\s+love)\s+to\s+meet|meet\s+(?:up|with\s+me|me)|schedule\s+a\s+(?:meeting|call|catch-?up)|book\s+a\s+(?:meeting|call)|free\s+(?:for|to)\s+(?:a\s+)?(?:meeting|call|coffee|lunch|chat)|(?:coffee|lunch|dinner)\s+(?:sometime|this\s+week|tomorrow|today|next)|hop\s+on\s+(?:a\s+)?(?:call|zoom)|jump\s+on\s+(?:a\s+)?(?:call|zoom)|sync\s+(?:up|this\s+week)|put\s+(?:something|time)\s+on\s+(?:the\s+)?calendar)\b|давай\s+(?:встретимся|созвонимся|увидимся)|хочу\s+(?:встретиться|увидеть)|можем\s+(?:встретиться|созвониться)|давайте\s+(?:встретимся|созвонимся)|назнач(?:ить|им)?\s+встреч|когда\s+(?:можешь|удобно)\s+(?:встретиться|созвониться)/i

const REPORT_ASK =
  /\b(?:(?:please|pls|can\s+you|could\s+you)\s+send\s+(?:me\s+)?(?:the\s+)?(?:report|deck|file|doc|document|numbers|update|summary)|(?:need|needs|want|wants)\s+(?:the\s+|your\s+)?(?:report|deck|numbers|update|summary|deliverable)(?:\s+by)?|(?:send|share)\s+(?:me\s+)?(?:the\s+)?(?:report|deck|file|numbers|update)\s+by|where\s+is\s+(?:the\s+)?(?:report|deck|update)|report\s+(?:by|before|due)|deliverable\s+by)\b|пришли(?:те)?\s+(?:мне\s+)?(?:отчет|отчёт|файл|док|презентац|цифр)|нужен\s+(?:отчет|отчёт|файл|док)|скинь(?:те)?\s+(?:отчет|отчёт|файл|презентац)|где\s+(?:отчет|отчёт)|к\s+завтра\s+(?:нужен|пришли)|дедлайн\s+(?:по\s+)?(?:отчету|отчёту|файлу)/i

const CALL_ASK =
  /\b(?:(?:can|could)\s+you\s+(?:call|ring)|(?:please|pls)\s+call(?:\s+me)?|(?:give|give\s+me)\s+a\s+(?:call|ring)|(?:let'?s|lets)\s+(?:hop\s+on\s+)?(?:a\s+)?call|call\s+me(?:\s+(?:back|today|tomorrow|tonight|later))?|ring\s+me|phone\s+me|hop\s+on\s+a\s+call)\b|перезвон(?:и|ите)|позвони(?:те)?(?:\s+мне)?|давай\s+созвонимся|можем\s+созвониться|созвонимся\s+(?:сегодня|завтра|вечером|утром)/i

/** Soft noise phrases that look like asks but aren't personal. */
const SOFT_NOISE =
  /\b(?:unsubscribe|view\s+in\s+browser|email\s+preferences|privacy\s+policy|terms\s+of\s+service|customer\s+support|call\s+(?:center|us\s+at|our)|toll-?free|phone\s+number|support@|help@|no\s+reply)\b|отписаться|поддержка|горячая\s+линия/i

function classifyIntent(text: string): MeetingAlert['intent'] | null {
  if (SOFT_NOISE.test(text)) return null
  const isMeet = MEET_ASK.test(text)
  const isReport = REPORT_ASK.test(text)
  const isCall = CALL_ASK.test(text)
  if (!isMeet && !isReport && !isCall) return null
  // Prefer the strongest personal ask; meet > report > call.
  if (isMeet) return 'meet'
  if (isReport) return 'report'
  return 'call'
}

/** Local heuristic — EN + RU. Precision over recall. */
export function extractMeetingsLocal(
  messages: InboxMessagePreview[],
  today: string,
): MeetingAlert[] {
  const out: MeetingAlert[] = []
  const seen = new Set<string>()

  for (const msg of messages) {
    if (isNoiseSender(msg.from, msg.fromName, msg.subject)) continue
    const blob = actionableText(msg)
    const intent = classifyIntent(blob)
    if (!intent) continue

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

    if (seen.has(msg.id)) continue
    seen.add(msg.id)

    out.push({
      id: hashId([msg.id, intent, summary]),
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
    if (out.length >= 5) break
  }
  return out
}

export async function extractMeetingsWithAI(
  messages: InboxMessagePreview[],
  provider: { client: OpenAI; model: string } | null,
  today: string,
): Promise<MeetingAlert[]> {
  const filtered = messages.filter((m) => !isNoiseSender(m.from, m.fromName, m.subject))
  const local = extractMeetingsLocal(filtered, today)
  if (!provider || filtered.length === 0) return local

  const lines = filtered
    .slice(0, 15)
    .map((m, i) => {
      const body = actionableText(m).replace(/\s+/g, ' ').slice(0, 500)
      return `[${i}] id=${m.id} from=${m.fromName} <${m.from}> subject=${m.subject} at=${m.date}\n${body}`
    })
    .join('\n\n')

  try {
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You find ONLY clear personal ACTIONABLE asks in INCOMING email.

INCLUDE only if the sender personally asks the recipient to:
- meet / catch up / schedule a meeting (intent=meet)
- send a report, deck, numbers, or similar deliverable by a time (intent=report)
- call them back / hop on a call (intent=call)

EXCLUDE aggressively (return empty meetings array if unsure):
- newsletters, digests, receipts, shipping, invoices, password resets
- GitHub/Slack/Notion/Jira/Calendar automated mail, product updates
- FYI threads, "thanks", polite closings ("see you", "call us at 1-800…")
- mere mention of Zoom/Teams/phone/deadline without a direct ask
- marketing, job alerts, social notifications

Be PRECISE. Prefer 0 over false positives. Max 4.
Return JSON: { "meetings": [ { "messageId": "...", "intent": "meet"|"report"|"call", "fromName": "...", "summary": "short", "notifyBody": "Alex wrote — wants to meet tomorrow 6pm", "suggestedDate": "YYYY-MM-DD or null", "suggestedTime": "HH:MM or null", "confidence": "high"|"medium" } ] }
Only include confidence "high" or "medium". Drop low confidence.
Today is ${today}. EN and RU.`,
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
        confidence?: string
      }[]
    }
    // Successful AI response (even empty) wins — do NOT fall back to noisy local.
    const list = Array.isArray(parsed.meetings) ? parsed.meetings : []
    const byId = new Map(filtered.map((m) => [m.id, m]))
    const aiOut: MeetingAlert[] = []
    for (const row of list.slice(0, 4)) {
      const conf = String(row.confidence || 'medium').toLowerCase()
      if (conf === 'low') continue
      const msg = byId.get(String(row.messageId || ''))
      if (!msg || !row.summary || !row.notifyBody) continue
      if (isNoiseSender(msg.from, msg.fromName, msg.subject)) continue
      const intentRaw = String(row.intent || '')
      if (!['meet', 'report', 'call'].includes(intentRaw)) continue
      const intent = intentRaw as MeetingAlert['intent']
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
    return aiOut
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
