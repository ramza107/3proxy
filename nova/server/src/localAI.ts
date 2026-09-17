import type { AIChatResponse, Priority } from '../../types'

type TaskLike = {
  id: string
  title: string
  date?: string | null
  time?: string | null
  priority?: Priority
  completed?: boolean
}

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
  const hourOnly = text.match(/\bat\s+(\d{1,2})\b/i)
  if (hourOnly) {
    const h = Number(hourOnly[1])
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

function parseDate(text: string, today: string): string | null {
  const lower = text.toLowerCase()
  if (/\btoday\b/.test(lower)) return today
  if (/\btomorrow\b/.test(lower)) return addDays(today, 1)
  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/)
  if (inDays) return addDays(today, Number(inDays[1]))
  return null
}

function splitTasks(text: string): string[] {
  const cleaned = text
    .replace(/^(remind me to|remind me|i need to|i have to|please|can you)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = cleaned
    .split(/,| and | & | then /i)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      p
        .replace(/\b(tomorrow|today|at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?|\d{1,2}:\d{2})\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length > 1)

  return parts.length ? parts : [cleaned]
}

function findTask(tasks: TaskLike[], hint: string) {
  const q = hint.toLowerCase()
  return tasks.find((t) => !t.completed && t.title.toLowerCase().includes(q))
}

/** Deterministic offline AI for MVP demos without OpenAI credentials. */
export function localAI(message: string, tasks: TaskLike[], today: string): AIChatResponse {
  const text = message.trim()
  const lower = text.toLowerCase()
  const open = tasks.filter((t) => !t.completed)

  if (/what.*(today|do i have|need to do)/i.test(lower) || /today'?s tasks?/i.test(lower)) {
    const todayTasks = open.filter((t) => t.date === today)
    if (!todayTasks.length) {
      return { reply: 'Your day looks clear. Want me to add something?', actions: [] }
    }
    const lines = todayTasks
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      .map((t, i) => `${i + 1}. ${t.title}${t.time ? ` — ${t.time}` : ''}`)
      .join('\n')
    const firstTimed = todayTasks.find((t) => t.time)
    return {
      reply: `You have ${todayTasks.length} thing${todayTasks.length > 1 ? 's' : ''} today:\n${lines}${
        firstTimed ? `\n${firstTimed.title} is time-sensitive, so I'd do that first.` : ''
      }`,
      actions: [],
    }
  }

  if (/finished|done|completed|i did|i bought|i called/i.test(lower)) {
    const hint = text
      .replace(/^(i )?(finished|done|completed|bought|called|did)\s*/i, '')
      .replace(/\b(buying|the|a|an)\b/gi, '')
      .trim()
    const match = findTask(open, hint) || findTask(open, text)
    if (match) {
      return {
        reply: `Nice. Marked "${match.title}" as completed ✓`,
        actions: [{ type: 'complete_task', task_id: match.id }],
      }
    }
    return {
      reply: "I couldn't find that task. Want me to show what you still have open?",
      actions: [],
    }
  }

  if (/delete|remove|cancel/i.test(lower)) {
    const match = findTask(open, text)
    if (match) {
      return {
        reply: `Removed "${match.title}".`,
        actions: [{ type: 'delete_task', task_id: match.id }],
      }
    }
  }

  const date = parseDate(text, today)
  const time = parseTime(text)
  const isReminder = /remind me/i.test(lower)
  const titles = splitTasks(text).slice(0, 6)

  if (isReminder && date && time && titles[0]) {
    const title = titles[0]
      .replace(/^to\s+/i, '')
      .replace(/^remind me to\s+/i, '')
      .replace(/^remind me\s+/i, '')
    return {
      reply: `Done. I'll remind you on ${date} at ${time}.`,
      actions: [{ type: 'create_reminder', title, date, time }],
    }
  }

  if (titles.length) {
    const actions = titles.map((title, index) => ({
      type: 'create_task' as const,
      title: title.replace(/^to\s+/i, ''),
      date,
      time: index === 0 ? time : null,
      priority: time ? ('high' as const) : ('medium' as const),
    }))

    if (actions.length === 1) {
      return {
        reply: `Got it. I created "${actions[0].title}"${date ? ` for ${date}` : ''}${
          time ? ` at ${time}` : ''
        }.`,
        actions,
      }
    }

    return {
      reply: `Got it. I added ${actions.length} tasks${date ? ` for ${date}` : ''} in a logical order.`,
      actions,
    }
  }

  return {
    reply: "Tell me what you need to get done — I can turn it into tasks and reminders.",
    actions: [],
  }
}
