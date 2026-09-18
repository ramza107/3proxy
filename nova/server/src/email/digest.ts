import type OpenAI from 'openai'
import type { GmailMessagePreview } from './gmail.js'

export type DigestSender = {
  fromName: string
  from: string
  count: number
  subjects: string[]
}

export type EmailDigest = {
  connected: boolean
  email: string | null
  demo: boolean
  total: number
  senders: DigestSender[]
  summary: string
  highlights: { fromName: string; subject: string }[]
  generatedAt: string
}

export function demoDigest(): EmailDigest {
  return {
    connected: false,
    email: null,
    demo: true,
    total: 5,
    senders: [
      {
        fromName: 'Mom',
        from: 'mom@example.com',
        count: 1,
        subjects: ['Weekend plans?'],
      },
      {
        fromName: 'Alex Chen',
        from: 'alex@work.example',
        count: 2,
        subjects: ['Q3 numbers', 'Standup notes'],
      },
      {
        fromName: 'Amazon',
        from: 'auto-confirm@amazon.com',
        count: 2,
        subjects: ['Your package is arriving today', 'Order update'],
      },
    ],
    summary:
      'Overnight: Mom and Alex wrote (personal + work). Amazon sent 2 shipping updates you can skim.',
    highlights: [
      { fromName: 'Mom', subject: 'Weekend plans?' },
      { fromName: 'Alex Chen', subject: 'Q3 numbers' },
      { fromName: 'Amazon', subject: 'Your package is arriving today' },
    ],
    generatedAt: new Date().toISOString(),
  }
}

export function groupSenders(messages: GmailMessagePreview[]): DigestSender[] {
  const map = new Map<string, DigestSender>()
  for (const m of messages) {
    const key = m.from.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      if (existing.subjects.length < 3) existing.subjects.push(m.subject)
    } else {
      map.set(key, {
        fromName: m.fromName,
        from: m.from,
        count: 1,
        subjects: [m.subject],
      })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export function buildLocalSummary(senders: DigestSender[], total: number): string {
  if (!total) return 'Overnight inbox looks quiet — no new messages to review.'
  const top = senders.slice(0, 4).map((s) => s.fromName)
  if (top.length === 1) return `Overnight: ${top[0]} wrote (${total} email${total > 1 ? 's' : ''}).`
  if (top.length === 2) return `Overnight: ${top[0]} and ${top[1]} wrote (${total} emails).`
  return `Overnight: ${top.slice(0, -1).join(', ')}, and ${top[top.length - 1]} wrote (${total} emails).`
}

export async function summarizeWithAI(
  messages: GmailMessagePreview[],
  senders: DigestSender[],
  provider: { client: OpenAI; model: string } | null,
): Promise<string> {
  const fallback = buildLocalSummary(senders, messages.length)
  if (!provider || messages.length === 0) return fallback

  const lines = messages
    .slice(0, 20)
    .map((m) => `- ${m.fromName} <${m.from}>: ${m.subject}`)
    .join('\n')

  try {
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You write a 1–2 sentence morning email brief for Wahrly. Name who wrote and what matters. Skip promo noise. No markdown. Max 220 characters.',
        },
        {
          role: 'user',
          content: `Overnight emails:\n${lines}\n\nWrite the brief.`,
        },
      ],
    })
    const text = completion.choices[0]?.message?.content?.trim()
    return text || fallback
  } catch {
    return fallback
  }
}

export async function buildDigest(params: {
  messages: GmailMessagePreview[]
  email: string
  provider: { client: OpenAI; model: string } | null
}): Promise<EmailDigest> {
  const senders = groupSenders(params.messages)
  const summary = await summarizeWithAI(params.messages, senders, params.provider)
  return {
    connected: true,
    email: params.email,
    demo: false,
    total: params.messages.length,
    senders,
    summary,
    highlights: params.messages.slice(0, 6).map((m) => ({
      fromName: m.fromName,
      subject: m.subject,
    })),
    generatedAt: new Date().toISOString(),
  }
}
