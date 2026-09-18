import type { AIAction, AIChatResponse, Priority, Task } from '../types'
import { nextMonthlyDate } from '../lib/taskExtras'

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
  if (/\b(today|сегодня)\b/.test(lower)) return today
  if (/\b(tomorrow|завтра)\b/.test(lower)) return addDays(today, 1)
  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/)
  if (inDays) return addDays(today, Number(inDays[1]))
  return null
}

function parseMonthlyDay(text: string): number | null {
  const lower = normalize(text)
  const en =
    lower.match(/\bevery\s+month\s+on\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/) ||
    lower.match(/\bmonthly\s+on\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/) ||
    lower.match(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\s+every\s+month\b/) ||
    lower.match(/\beach\s+month\s+on\s+(?:the\s+)?(\d{1,2})\b/)
  if (en) {
    const d = Number(en[1])
    if (d >= 1 && d <= 31) return d
  }
  const ru =
    lower.match(/кажд(?:ое|ый|ую|ого)\s+(\d{1,2})\s*(?:-?[еe]|го|ое)?\s*числ/) ||
    lower.match(/каждое\s+(\d{1,2})\s*число/) ||
    lower.match(/раз\s+в\s+месяц\s+(?:на\s+)?(\d{1,2})/) ||
    lower.match(/каждый\s+месяц\s+(\d{1,2})/)
  if (ru) {
    const d = Number(ru[1])
    if (d >= 1 && d <= 31) return d
  }
  return null
}

function monthlyTitle(text: string): string {
  let t = text.trim()
  t = t
    .replace(/^(remind me to|remind me|i need to|i have to|need to|please|can you)\s+/i, '')
    .replace(/\bevery\s+month\s+on\s+the\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, ' ')
    .replace(/\bmonthly\s+on\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b/gi, ' ')
    .replace(/\bon\s+the\s+\d{1,2}(?:st|nd|rd|th)?\s+every\s+month\b/gi, ' ')
    .replace(/\beach\s+month\s+on\s+(?:the\s+)?\d{1,2}\b/gi, ' ')
    .replace(/кажд(?:ое|ый|ую|ого)\s+\d{1,2}\s*(?:-?[еe]|го|ое)?\s*числ[ао]?\s*/gi, ' ')
    .replace(/раз\s+в\s+месяц\s+(?:на\s+)?\d{1,2}\s*/gi, ' ')
    .replace(/каждый\s+месяц\s+\d{1,2}\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return t.length > 2 ? t.slice(0, 80) : 'Monthly task'
}

function parseShoppingList(text: string): { title: string; items: string[] } | null {
  const raw = text.trim()
  const lower = normalize(raw)

  const shoppingIntent =
    /(buy|grocery|groceries|shop|store|supermarket|магазин|купить|продукт|еды)/i.test(lower)
  if (!shoppingIntent) return null

  // "buy groceries: milk, bread" / "сходи в магазин: молоко, хлеб"
  const colon = raw.split(/[:：]/)
  let itemPart = ''
  let title = 'Buy groceries'
  if (colon.length >= 2) {
    title = colon[0]
      .replace(/^(remind me to|i need to|please|can you)\s+/i, '')
      .trim() || 'Buy groceries'
    itemPart = colon.slice(1).join(':')
  } else {
    // "buy milk, bread and eggs" / "купить молоко хлеб яйца"
    const afterBuy = raw.match(
      /(?:buy|get|pick up|купить|возьми|сходи в магазин(?:\s+за)?)\s+(.+)$/i,
    )
    if (!afterBuy) return null
    itemPart = afterBuy[1]
    title = /магазин|grocery|shop|store/i.test(lower) ? 'Buy groceries' : 'Buy groceries'
  }

  const items = itemPart
    .split(/,| and | & |;| и |，/i)
    .map((p) =>
      p
        .replace(
          /\b(tomorrow|today|сегодня|завтра|at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?|\d{1,2}:\d{2}|кажд(?:ое|ый).*)\b/gi,
          '',
        )
        .replace(/^(to|need to|have to|за)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length > 1 && !/^(groceries|products|продукт\w*|еду|food)$/i.test(p))

  if (items.length < 2) return null
  return { title: title.slice(0, 80), items: items.slice(0, 30) }
}

function isSmallTalk(text: string) {
  const lower = normalize(text)
  return (
    /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|nice|bye|good\s*(morning|evening|night)?|привет|спасибо)\b/.test(
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
    /\b(remind|reminder|todo|to-?do|task|schedule|plan|магазин|купить|оплат)\b/.test(lower) ||
    /\b(need to|have to|gotta|must|should|buy|call|clean|finish|pay|send|email|pick up|book|meet)\b/.test(
      lower,
    ) ||
    /\b(tomorrow|today|at\s+\d{1,2}|каждое|каждый месяц)\b/.test(lower)
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
        "I'm Wahrly — your life assistant. Tell me something to do (for example: \"Buy groceries: milk, bread\" or \"Every month on the 15th pay rent\").",
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

  const monthlyDay = parseMonthlyDay(text)
  const shopping = parseShoppingList(text)
  const date = monthlyDay != null ? nextMonthlyDate(monthlyDay, today) : parseDate(text, today)
  const time = parseTime(text)

  if (shopping) {
    const action: AIAction = {
      type: 'create_task',
      title: shopping.title,
      date,
      time,
      priority: (time ? 'high' : 'medium') as Priority,
      checklist: shopping.items,
      recurrence: monthlyDay != null ? { type: 'monthly', dayOfMonth: monthlyDay } : null,
    }
    return {
      reply: `Saved "${shopping.title}" with ${shopping.items.length} items → open Tasks and tick them off.${
        monthlyDay != null ? ` Repeats every month on the ${monthlyDay}.` : ''
      }`,
      actions: [action],
    }
  }

  if (monthlyDay != null) {
    const title = monthlyTitle(text)
    return {
      reply: `Saved "${title}" — every month on the ${monthlyDay} → ${whereLabel(date, today)}.`,
      actions: [
        {
          type: 'create_task',
          title,
          date,
          time,
          priority: 'medium',
          recurrence: { type: 'monthly', dayOfMonth: monthlyDay },
        },
      ],
    }
  }

  if (!hasTaskIntent(text)) {
    return {
      reply:
        'I save real to-dos in the Tasks tab. Try: "Buy groceries: milk, bread, eggs" or "Every month on the 15th pay rent".',
      actions: [],
    }
  }

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
