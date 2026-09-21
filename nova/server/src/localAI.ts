import type { AIChatResponse, Priority } from '../../types'

type TaskLike = {
  id: string
  title: string
  date?: string | null
  time?: string | null
  priority?: Priority
  completed?: boolean
}

type BillLike = {
  id: string
  title: string
  amount?: number
  currency?: string
  dayOfMonth?: number
  lastPaidMonth?: string | null
  active?: boolean
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
    text.match(/\bat\s+(\d{1,2}):(\d{2})\b/i) ||
    text.match(/(?:^|[^\p{L}])в\s+(\d{1,2}):(\d{2})(?=[^\p{L}]|$)/iu) ||
    text.match(/\b(\d{1,2}):(\d{2})\b/)
  if (twentyFour) {
    return `${String(Number(twentyFour[1])).padStart(2, '0')}:${twentyFour[2]}`
  }
  const hourOnly =
    text.match(/\bat\s+(\d{1,2})\b/i) || text.match(/(?:^|[^\p{L}])в\s+(\d{1,2})(?=[^\p{L}]|$)/iu)
  if (hourOnly) {
    const h = Number(hourOnly[1])
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

function parseDate(text: string, today: string): string | null {
  const lower = normalize(text)
  if (/\btoday\b/.test(lower) || /(^|[^\p{L}])сегодня(?=[^\p{L}]|$)/u.test(lower)) return today
  if (/\btomorrow\b/.test(lower) || /(^|[^\p{L}])завтра(?=[^\p{L}]|$)/u.test(lower)) {
    return addDays(today, 1)
  }
  if (
    /\bday after tomorrow\b/.test(lower) ||
    /(^|[^\p{L}])послезавтра(?=[^\p{L}]|$)/u.test(lower)
  ) {
    return addDays(today, 2)
  }
  const inDays =
    lower.match(/\bin\s+(\d+)\s+days?\b/) ||
    lower.match(/(?:^|[^\p{L}])через\s+(\d+)\s+(день|дня|дней)(?=[^\p{L}]|$)/u)
  if (inDays) return addDays(today, Number(inDays[1]))
  return null
}

function isSmallTalk(text: string) {
  const lower = normalize(text)
  return (
    /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|nice|bye|good\s*(morning|evening|night)?)\b/.test(
      lower,
    ) ||
    /^(привет|здравствуй|здравствуйте|спасибо|пока|доброе\s*(утро|день|вечер))\b/.test(lower) ||
    /^(who are you|who r u|what are you|what'?s up|how are you|how r u|how do you do)\b/.test(
      lower,
    ) ||
    /^(who|what|how|why|where|when)\b.{0,24}\?$/.test(lower)
  )
}

function hasTaskIntent(text: string) {
  const lower = normalize(text)
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
    /\b(tomorrow|today|at\s+\d{1,2})\b/.test(lower) ||
    /(надо|нужно|должен|должна|купи|купить|позвони|убер|постира|забер|забр|приготов|напомни|завтра|сегодня|задач|через\s+\d+)/i.test(
      lower,
    )
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
    .replace(
      /^(remind me to|remind me|i need to|i have to|need to|please|can you|напомни(ть)?\s*(мне)?\s*(о|про)?|надо|нужно|пожалуйста)\s+/i,
      '',
    )
    .trim()

  const parts = cleaned
    .split(/,| and | & | then | и | потом | а также /i)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) =>
      p
        .replace(
          /\b(tomorrow|today|day after tomorrow|at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?|\d{1,2}:\d{2})\b/gi,
          '',
        )
        .replace(/(?:^|[^\p{L}])(завтра|сегодня|послезавтра)(?=[^\p{L}]|$)/giu, ' ')
        .replace(/(?:^|[^\p{L}])через\s+\d+\s+(день|дня|дней)(?=[^\p{L}]|$)/giu, ' ')
        .replace(/(?:^|[^\p{L}])в\s+\d{1,2}(?::\d{2})?(?=[^\p{L}]|$)/giu, ' ')
        .replace(/\bin\s+\d+\s+days?\b/gi, ' ')
        .replace(/^(to|need to|have to|надо|нужно)\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((p) => p.length > 1)

  return parts.length ? parts : [cleaned]
}

function isRu(text: string) {
  return /[а-яё]/i.test(text)
}

function findTask(tasks: TaskLike[], hint: string) {
  const q = hint.toLowerCase()
  return tasks.find((t) => !t.completed && t.title.toLowerCase().includes(q))
}

/** Deterministic offline AI for MVP demos without OpenAI credits. */
export function localAI(
  message: string,
  tasks: TaskLike[],
  today: string,
  bills: BillLike[] = [],
): AIChatResponse {
  const text = message.trim()
  const lower = normalize(text)
  const open = tasks.filter((t) => !t.completed)

  if (isSmallTalk(text)) {
    return {
      reply: isRu(text)
        ? 'Я Wahrly — помощник по делам. Скажи, что сделать (например: «Завтра купить продукты») — добавлю в Tasks.'
        : "I'm Wahrly — your life assistant. Tell me something to do (for example: \"Tomorrow buy groceries\") and I'll put it in Tasks.",
      actions: [],
    }
  }

  if (
    /(проверь|проверить|посмотри|покажи).{0,40}(почт|inbox|gmail|письм)/i.test(lower) ||
    /\b(check|read|scan)\b.{0,40}\b(e-?mail|inbox|mail|gmail)\b/i.test(lower)
  ) {
    return {
      reply: /[а-яё]/i.test(text)
        ? 'Могу проверить почту — скажи «проверь почту» в чате (Gmail в Settings) или открой Home.'
        : 'I can check your mail — say “check my email” in chat (connect Gmail in Settings) or open Home.',
      actions: [],
    }
  }

  if (
    /what.*(today|do i have|need to do)/i.test(lower) ||
    /today'?s tasks?/i.test(lower) ||
    /(что|какие).{0,20}(сегодня|дела|задач)/i.test(lower)
  ) {
    const todayTasks = open.filter((t) => t.date === today)
    if (!todayTasks.length) {
      return {
        reply: isRu(text)
          ? 'На сегодня пусто. Добавить что-нибудь?'
          : 'Your day looks clear. Want me to add something?',
        actions: [],
      }
    }
    const lines = todayTasks
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      .map((t, i) => `${i + 1}. ${t.title}${t.time ? ` — ${t.time}` : ''}`)
      .join('\n')
    const firstTimed = todayTasks.find((t) => t.time)
    return {
      reply: isRu(text)
        ? `На сегодня ${todayTasks.length}:\n${lines}${
            firstTimed ? `\nСначала лучше «${firstTimed.title}» — там время.` : ''
          }\n\nСкажи «разложи день», чтобы расставить по слотам.`
        : `You have ${todayTasks.length} thing${todayTasks.length > 1 ? 's' : ''} today:\n${lines}${
            firstTimed ? `\n${firstTimed.title} is time-sensitive, so I'd do that first.` : ''
          }\n\nSay “plan my day” to auto-fill free slots.`,
      actions: [],
    }
  }

  if (
    /(разлож|спланиру|организуй).{0,20}день/i.test(lower) ||
    /\b(plan|organize|schedule)\b.{0,20}\b(day|today)\b/i.test(lower)
  ) {
    return {
      reply: isRu(text)
        ? 'Открой Home → Plan day — или скажи «разложи день» онлайн, и Wahrly разложит задачи по рабочим слотам.'
        : 'Open Home and tap Plan day — or say “plan my day” again online so Wahrly packs tasks into your work hours.',
      actions: [],
    }
  }

  if (
    /finished|done|completed|i did|i bought|i called/i.test(lower) ||
    /(сделал|сделала|купил|купила|позвонил|закончил|готово)\b/i.test(lower)
  ) {
    const hint = text
      .replace(/^(i )?(finished|done|completed|bought|called|did)\s*/i, '')
      .replace(/^(я\s+)?(сделал|сделала|купил|купила|позвонил|закончил|готово)\s*/i, '')
      .replace(/\b(buying|the|a|an)\b/gi, '')
      .trim()
    const match = findTask(open, hint) || findTask(open, text)
    if (match) {
      return {
        reply: isRu(text)
          ? `Ок. «${match.title}» отмечена ✓`
          : `Nice. Marked "${match.title}" as completed ✓`,
        actions: [{ type: 'complete_task', task_id: match.id }],
      }
    }
    return {
      reply: isRu(text)
        ? 'Не нашёл такую задачу. Показать, что ещё открыто?'
        : "I couldn't find that task. Want me to show what you still have open?",
      actions: [],
    }
  }

  if (/delete|remove|cancel|удали|убери|отмени/i.test(lower)) {
    const match = findTask(open, text)
    if (match) {
      return {
        reply: isRu(text) ? `Убрал «${match.title}».` : `Removed "${match.title}".`,
        actions: [{ type: 'delete_task', task_id: match.id }],
      }
    }
  }

  const paidBill =
    /(оплатил|оплатила|заплатил|mark\s+\w+\s+paid|paid\s+(the\s+)?)/i.test(lower) ||
    /\b(mark|mark as)\b.{0,20}\bpaid\b/i.test(lower)
  if (paidBill && bills.length) {
    const hint = text
      .replace(/^(i\s+)?(paid|оплатил|оплатила|заплатил)\s*/i, '')
      .replace(/\b(mark|as|paid|the|bill|счет|счёт)\b/gi, '')
      .trim()
    const match = bills.find((b) =>
      b.title.toLowerCase().includes((hint || lower).toLowerCase().slice(0, 12)),
    )
    if (match) {
      return {
        reply: isRu(text)
          ? `Отметил «${match.title}» как оплаченный → Bills.`
          : `Marked “${match.title}” paid → Bills.`,
        actions: [{ type: 'mark_bill_paid', bill_id: match.id, title_hint: match.title }],
      }
    }
  }

  const billCreate =
    /\b(add|create|new)\b.{0,12}\bbill\b/i.test(lower) ||
    /(добав(ь|ить)|создай).{0,20}(счет|счёт|платеж)/i.test(lower)
  if (billCreate) {
    const dayMatch =
      text.match(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/i) ||
      text.match(/\bday\s+(\d{1,2})\b/i) ||
      text.match(/(\d{1,2})\s*(числа|числ)/i)
    let dayOfMonth = dayMatch ? Number(dayMatch[1]) : Number(today.slice(8, 10)) || 1
    if (dayOfMonth < 1 || dayOfMonth > 28) dayOfMonth = Math.min(28, Math.max(1, dayOfMonth))

    const amountMatch =
      text.match(/(?:\$|€|uah|usd|eur|грн)?\s*(\d+[.,]?\d*)\s*(?:uah|usd|eur|грн|\$|€)?/i) ||
      text.match(/\b(\d+[.,]?\d*)\b/)
    const amount = amountMatch ? Number(amountMatch[1].replace(',', '.')) : 0

    let title =
      text
        .replace(/\b(add|create|new|bill)\b/gi, ' ')
        .replace(/(?:^|[^\p{L}])(счет|счёт|платеж|добавь|добавить|создай)(?=[^\p{L}]|$)/giu, ' ')
        .replace(/\bon\s+the\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, ' ')
        .replace(/\bday\s+\d{1,2}\b/gi, ' ')
        .replace(/\d{1,2}\s*(числа|числ)/gi, ' ')
        .replace(/\b(\d+[.,]?\d*)\b/g, ' ')
        .replace(/\b(uah|usd|eur|грн|\$|€)\b/gi, ' ')
        .replace(/(?:^|[^\p{L}])грн(?=[^\p{L}]|$)/giu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40) || 'Bill'
    return {
      reply: isRu(text)
        ? `Счёт «${title}» ${amount || '—'} → Bills.`
        : `Bill “${title}” ${amount || '—'} → Bills.`,
      actions: [
        {
          type: 'create_bill',
          title,
          amount: amount || 0,
          currency: 'UAH',
          dayOfMonth,
          category: 'General',
        },
      ],
    }
  }

  if (!hasTaskIntent(text)) {
    return {
      reply: isRu(text)
        ? 'Я сохраняю дела во вкладке Tasks. Попробуй: «Напомни позвонить маме завтра в 19» или «Купить продукты завтра».'
        : 'I save real to-dos in the Tasks tab. Try: "Remind me to call Mom tomorrow at 7" or "Buy groceries tomorrow".',
      actions: [],
    }
  }

  const date = parseDate(text, today)
  const time = parseTime(text)
  const isReminder = /remind me|напомни/i.test(lower)
  const titles = splitTasks(text).slice(0, 6)

  if (isReminder && date && time && titles[0]) {
    const title = titles[0]
      .replace(/^to\s+/i, '')
      .replace(/^remind me to\s+/i, '')
      .replace(/^remind me\s+/i, '')
      .replace(/^напомни(ть)?\s*(мне)?\s*(о|про)?\s*/i, '')
    return {
      reply: isRu(text)
        ? `Готово. Напоминание → ${whereLabel(date, today)} в ${time}.`
        : `Done. Reminder saved → ${whereLabel(date, today)} at ${time}.`,
      actions: [{ type: 'create_reminder', title, date, time }],
    }
  }

  if (titles.length) {
    const actions = titles.map((title, index) => ({
      type: 'create_task' as const,
      title: title.replace(/^to\s+/i, '').replace(/^(надо|нужно)\s+/i, ''),
      date,
      time: index === 0 ? time : null,
      priority: time ? ('high' as const) : ('medium' as const),
    }))
    const place = whereLabel(date, today)

    if (actions.length === 1) {
      return {
        reply: isRu(text)
          ? `Сохранил «${actions[0].title}» → ${place}${time ? ` в ${time}` : ''}.`
          : `Saved "${actions[0].title}" → open ${place}${time ? ` at ${time}` : ''}.`,
        actions,
      }
    }

    return {
      reply: isRu(text)
        ? `Сохранил ${actions.length} задач → ${place}.`
        : `Saved ${actions.length} tasks → open ${place}.`,
      actions,
    }
  }

  return {
    reply: isRu(text)
      ? 'Скажи, что нужно сделать — добавлю в Tasks.'
      : "Tell me what you need to get done — I'll add it under Tasks.",
    actions: [],
  }
}
