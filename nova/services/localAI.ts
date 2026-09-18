import type { AIChatResponse, Priority, Task } from '../types'

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\btommorow\b/g, 'tomorrow')
    .replace(/\btomorow\b/g, 'tomorrow')
    .replace(/\btabacco\b/g, 'tobacco')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseTime(text: string): string | null {
  const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (ampm) {
    let h = Number(ampm[1])
    const m = ampm[2] ? Number(ampm[2]) : 0
    const mer = ampm[3].toLowerCase()
    if (mer === 'pm' && h < 12) h += 12
    if (mer === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const twentyFour =
    text.match(/\bat\s+(\d{1,2}):(\d{2})\b/i) || text.match(/\b(\d{1,2}):(\d{2})\b/)
  if (twentyFour) {
    return `${String(Number(twentyFour[1])).padStart(2, '0')}:${twentyFour[2]}`
  }
  const hourOnly = text.match(/\bat\s+(\d{1,2})\b/i)
  if (hourOnly) {
    const h = Number(hourOnly[1])
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

function parseDate(text: string, today: string): string | null {
  const lower = normalize(text)
  if (/\btoday\b/.test(lower)) return today
  if (/\btomorrow\b/.test(lower)) return addDays(today, 1)
  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/)
  if (inDays) return addDays(today, Number(inDays[1]))
  return null
}

function isSmallTalk(text: string) {
  const lower = normalize(text)
  return (
    /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|nice|bye|good\s*(morning|evening|night)?)\b/.test(
      lower,
    ) ||
    /^(who are you|who r u|what are you|what'?s up|how are you|how r u|how do you do)\b/.test(
      lower,
    ) ||
    /^(who|what|how|why|where|when)\b.{0,24}\?$/.test(lower)
  )
}

function hasTaskIntent(text: string) {
  const lower = normalize(text)
  return (
    /\b(remind|reminder|todo|to-?do|task|schedule|plan)\b/.test(lower) ||
    /\b(need to|have to|gotta|must|should|buy|call|clean|finish|pay|send|email|pick up|book|meet)\b/.test(
      lower,
    ) ||
    /\b(tomorrow|today|at\s+\d{1,2})\b/.test(lower)
  )
}

function whereLabel(date: string | null, today: string) {
  if (!date) return 'Tasks → Upcoming'
  if (date === today) return 'Tasks → Today'
  if (date === addDays(today, 1)) return 'Tasks → Tomorrow'
  return `Tasks → Upcoming (${date})`
}

function splitTasks(text: string): string[] {
  const cleaned = normalize(text)
    .replace(/^(remind me to|remind me|i need to|i have to|need to|please|can you)\s+/i, '')
    .trim()

  return cleaned
    .split(/,| and | & | then /i)
    .map((p) =>
      p
        .replace(
          /\b(tomorrow|today|at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?|\d{1,2}:\d{2})\b/gi,
          '',
        )
        .replace(/^(to|need to|have to)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length > 1)
}

/** Offline fallback when the AI server / OpenAI is unavailable. */
export function clientLocalAI(message: string, tasks: Task[]): AIChatResponse {
  const today = new Date().toISOString().slice(0, 10)
  const text = message.trim()
  const lower = normalize(text)
  const open = tasks.filter((t) => !t.completed)

  if (isSmallTalk(text)) {
    return {
      reply:
        "I'm Wahrly — your life assistant. Tell me something to do (for example: \"Tomorrow buy groceries\") and I'll put it in Tasks.",
      actions: [],
    }
  }

  if (/what.*(today|do i have|need to do)/i.test(lower)) {
    const todayTasks = open.filter((t) => t.date === today)
    if (!todayTasks.length) {
      return { reply: 'Your day looks clear. Want me to add something?', actions: [] }
    }
    const lines = todayTasks
      .map((t, i) => `${i + 1}. ${t.title}${t.time ? ` — ${t.time}` : ''}`)
      .join('\n')
    return { reply: `You have ${todayTasks.length} things today:\n${lines}`, actions: [] }
  }

  if (/finished|done|completed|i bought|i called/i.test(lower)) {
    const match = open.find((t) => lower.includes(t.title.toLowerCase().split(' ')[0]))
    if (match) {
      return {
        reply: `Nice. Marked "${match.title}" as completed ✓`,
        actions: [{ type: 'complete_task', task_id: match.id }],
      }
    }
  }

  if (!hasTaskIntent(text)) {
    return {
      reply:
        'I save real to-dos in the Tasks tab. Try: "Remind me to call Mom tomorrow at 7" or "Buy groceries tomorrow".',
      actions: [],
    }
  }

  const date = parseDate(text, today)
  const time = parseTime(text)
  const titles = splitTasks(text).slice(0, 6)
  const isReminder = /remind me/i.test(lower)

  if (isReminder && date && time && titles[0]) {
    const title = titles[0].replace(/^to\s+/i, '')
    return {
      reply: `Done. Reminder saved → ${whereLabel(date, today)} at ${time}.`,
      actions: [{ type: 'create_reminder', title, date, time }],
    }
  }

  if (titles.length) {
    const actions = titles.map((title, index) => ({
      type: 'create_task' as const,
      title: title.replace(/^to\s+/i, ''),
      date,
      time: index === 0 ? time : null,
      priority: (time ? 'high' : 'medium') as Priority,
    }))
    const place = whereLabel(date, today)
    return {
      reply:
        actions.length === 1
          ? `Saved "${actions[0].title}" → open ${place}.`
          : `Saved ${actions.length} tasks → open ${place}.`,
      actions,
    }
  }

  return {
    reply: 'Tell me what you need to get done — I\'ll add it under Tasks.',
    actions: [],
  }
}
