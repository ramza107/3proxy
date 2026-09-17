import type { AIChatResponse, Priority, Task } from '../types'

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
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
  const twentyFour = text.match(/\bat\s+(\d{1,2}):(\d{2})\b/i) || text.match(/\b(\d{1,2}):(\d{2})\b/)
  if (twentyFour) {
    return `${String(Number(twentyFour[1])).padStart(2, '0')}:${twentyFour[2]}`
  }
  return null
}

function parseDate(text: string, today: string): string | null {
  const lower = text.toLowerCase()
  if (/\btoday\b/.test(lower)) return today
  if (/\btomorrow\b/.test(lower)) return addDays(today, 1)
  return null
}

function splitTasks(text: string): string[] {
  const cleaned = text
    .replace(/^(remind me to|remind me|i need to|i have to|please|can you)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
    .split(/,| and | & | then /i)
    .map((p) =>
      p
        .replace(/\b(tomorrow|today|at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?|\d{1,2}:\d{2})\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length > 1)
}

/** Offline fallback when the AI server is unavailable. */
export function clientLocalAI(message: string, tasks: Task[]): AIChatResponse {
  const today = new Date().toISOString().slice(0, 10)
  const text = message.trim()
  const lower = text.toLowerCase()
  const open = tasks.filter((t) => !t.completed)

  if (/what.*(today|do i have|need to do)/i.test(lower)) {
    const todayTasks = open.filter((t) => t.date === today)
    if (!todayTasks.length) return { reply: 'Your day looks clear. Want me to add something?', actions: [] }
    const lines = todayTasks.map((t, i) => `${i + 1}. ${t.title}${t.time ? ` — ${t.time}` : ''}`).join('\n')
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

  const date = parseDate(text, today)
  const time = parseTime(text)
  const titles = splitTasks(text).slice(0, 6)
  const isReminder = /remind me/i.test(lower)

  if (isReminder && date && time && titles[0]) {
    return {
      reply: `Done. I'll remind you on ${date} at ${time}.`,
      actions: [{ type: 'create_reminder', title: titles[0].replace(/^to\s+/i, ''), date, time }],
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
    return {
      reply:
        actions.length === 1
          ? `Got it. I created "${actions[0].title}".`
          : `Got it. I added ${actions.length} tasks${date ? ` for ${date}` : ''}.`,
      actions,
    }
  }

  return { reply: 'Tell me what you need to get done.', actions: [] }
}
