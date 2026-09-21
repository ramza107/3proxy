import type { AIChatResponse, Bill, Priority, Task } from '../types'

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
  // Don't treat “check my email” as creating a to-do
  if (
    /(проверь|проверить|посмотри|покажи).{0,40}(почт|inbox|gmail|письм)/i.test(lower) ||
    /\b(check|read|scan)\b.{0,40}\b(e-?mail|inbox|mail|gmail)\b/i.test(lower)
  ) {
    return false
  }
  return (
    /\b(remind|reminder|todo|to-?do|task|schedule|plan)\b/.test(lower) ||
    /\b(need to|have to|gotta|must|should|buy|call|clean|finish|pay|send|pick up|book|meet)\b/.test(
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
export function clientLocalAI(
  message: string,
  tasks: Task[],
  bills?: Bill[],
): AIChatResponse {
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

  if (
    /(проверь|проверить|посмотри|покажи).{0,40}(почт|inbox|gmail|письм)/i.test(lower) ||
    /\b(check|read|scan)\b.{0,40}\b(e-?mail|inbox|mail|gmail)\b/i.test(lower)
  ) {
    return {
      reply: /[а-яё]/i.test(text)
        ? 'Могу проверить почту — скажи ещё раз «проверь почту» (нужен Connected Gmail в Settings). Или открой Home.'
        : 'I can check your mail — say “check my email” again (Gmail must be connected in Settings), or open Home.',
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

  // Bills: "add bill Netflix 15 on the 5th" / "оплатил интернет"
  const paidBill =
    /(оплатил|оплатила|заплатил|mark\s+\w+\s+paid|paid\s+(the\s+)?)/i.test(lower) ||
    /\b(mark|mark as)\b.{0,20}\bpaid\b/i.test(lower)
  if (paidBill && bills?.length) {
    const hint =
      text
        .replace(/^(i\s+)?(paid|оплатил|оплатила|заплатил)\s*/i, '')
        .replace(/\b(mark|as|paid|the|bill|счет|счёт)\b/gi, '')
        .trim() || lower
    const match = bills.find((b) => b.title.toLowerCase().includes(hint.toLowerCase().slice(0, 12)))
    if (match) {
      return {
        reply: /[а-яё]/i.test(text)
          ? `Отметил «${match.title}» как оплаченный → Bills.`
          : `Marked “${match.title}” paid → Bills.`,
        actions: [{ type: 'mark_bill_paid', bill_id: match.id, title_hint: match.title }],
      }
    }
  }

  const billCreate =
    /\b(add|create|new)\b.{0,12}\bbill\b/i.test(lower) ||
    /(добав(ь|ить)|создай).{0,20}(счет|счёт|платеж)/i.test(lower) ||
    /\bbill\b.{0,20}\b(\d+)/i.test(lower)
  if (billCreate) {
    const dayMatch =
      text.match(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/i) ||
      text.match(/\bday\s+(\d{1,2})\b/i) ||
      text.match(/(\d{1,2})\s*(числа|числ)/i)
    let dayOfMonth = dayMatch ? Number(dayMatch[1]) : new Date().getDate()
    if (dayOfMonth < 1 || dayOfMonth > 28) dayOfMonth = Math.min(28, Math.max(1, dayOfMonth))

    const amountMatch = text.match(/\b(\d+[.,]?\d*)\b/)
    const amount = amountMatch ? Number(amountMatch[1].replace(',', '.')) : 0
    const title =
      text
        .replace(/\b(add|create|new|bill|счет|счёт|платеж|добавь|добавить|создай)\b/gi, ' ')
        .replace(/\bon\s+the\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, ' ')
        .replace(/\bday\s+\d{1,2}\b/gi, ' ')
        .replace(/\d{1,2}\s*(числа|числ)/gi, ' ')
        .replace(/\b(\d+[.,]?\d*)\b/g, ' ')
        .replace(/\b(uah|usd|eur|грн|\$|€)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40) || 'Bill'
    const currency = /\b(uah|грн)\b/i.test(lower)
      ? 'UAH'
      : /\b(usd|\$)\b/i.test(lower)
        ? 'USD'
        : /\b(eur|€)\b/i.test(lower)
          ? 'EUR'
          : 'UAH'
    return {
      reply: /[а-яё]/i.test(text)
        ? `Счёт «${title}» ${amount || '—'} ${currency} → Bills.`
        : `Bill “${title}” ${amount || '—'} ${currency} → Bills.`,
      actions: [
        {
          type: 'create_bill',
          title,
          amount: amount || 0,
          currency,
          dayOfMonth,
          category: 'General',
        },
      ],
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
