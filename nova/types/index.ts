export type Priority = 'low' | 'medium' | 'high'

/** How a task repeats after completion */
export type TaskRecurrence = {
  freq: 'daily' | 'weekly'
  /** For weekly — JS getDay() 0=Sun … 6=Sat */
  days?: Dow[]
}

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string | null
  time: string | null
  priority: Priority
  completed: boolean
  /** When set, completing spawns the next occurrence */
  recurrence?: TaskRecurrence | null
  /** Link back to a Gmail loop (promise / inbox ask) */
  sourceKind?: 'promise' | 'meeting' | null
  sourceId?: string | null
  created_at: string
  updated_at: string
}

export type Reminder = {
  id: string
  user_id: string
  task_id: string | null
  title: string
  scheduled_for: string
  completed: boolean
  created_at: string
}

/** Recurring monthly payment / subscription */
export type Bill = {
  id: string
  title: string
  /** Amount in major units (e.g. 499.00) */
  amount: number
  currency: string
  /** Day of month 1–28 (clamped for short months) */
  dayOfMonth: number
  category: string
  notes: string | null
  /** How / where to pay — link or short note */
  payHowTo?: string | null
  active: boolean
  /** YYYY-MM — last month marked paid */
  lastPaidMonth: string | null
  /** Recent months marked paid (YYYY-MM), newest last */
  paidHistory?: string[]
  /** Per-bill reminder override; undefined = follow Settings */
  remindEnabled?: boolean
  created_at: string
  updated_at: string
}

/** How bill due reminders repeat after the first ping */
export type BillRemindCadence = 'once' | 'daily'

export type Profile = {
  id: string
  email: string
  name: string | null
  created_at: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type AIAction =
  | {
      type: 'create_task'
      title: string
      date: string | null
      time: string | null
      priority: Priority
      /** When set, completing the task spawns the next occurrence */
      recurrence?: TaskRecurrence | null
    }
  | {
      type: 'update_task'
      task_id: string
      title?: string
      date?: string | null
      time?: string | null
      priority?: Priority
    }
  | {
      type: 'complete_task'
      task_id: string
    }
  | {
      type: 'delete_task'
      task_id: string
    }
  | {
      type: 'create_reminder'
      title: string
      date: string
      time: string
      task_id?: string
    }
  | {
      type: 'create_bill'
      title: string
      amount: number
      currency?: string
      dayOfMonth: number
      category?: string
      payHowTo?: string | null
    }
  | {
      type: 'mark_bill_paid'
      bill_id?: string | null
      title_hint?: string | null
      month?: string | null
    }
  | {
      type: 'create_calendar_event'
      title: string
      date: string
      time: string
      durationMin?: number
      location?: string | null
    }

export type AIChatResponse = {
  reply: string
  actions: AIAction[]
}

import type { AppLanguage } from '../lib/i18n'

export type UserSettings = {
  name: string
  /** UI language for tabs, Home, Settings */
  language: AppLanguage
  notificationsEnabled: boolean
  aiTone: 'friendly' | 'concise' | 'coach'
  onboardingComplete: boolean
  /** HH:MM — morning brief of today's list */
  morningBriefTime: string
  morningBriefEnabled: boolean
  /** YYYY-MM-DD — last time Morning brief was dismissed / planned on Home */
  lastMorningBriefDate: string | null
  /** City for Open-Meteo weather on morning brief (e.g. Kyiv) */
  weatherCity: string
  /** HH:MM — evening clear / prepare tomorrow */
  eveningClearTime: string
  eveningClearEnabled: boolean
  /** YYYY-MM-DD — last time Evening Clear ritual was finished */
  lastEveningClearDate: string | null
  /** Monday morning weekly overview */
  weeklyBriefEnabled: boolean
  /** YYYY-MM-DD — last weekly brief dismissed */
  lastWeeklyBriefDate: string | null
  /** Show automatic Gmail morning inbox on Home */
  emailDigestEnabled: boolean
  /**
   * When on: scan Sent for “I’ll…” promises and auto-add them as Tasks.
   * When off: Home still can show the Promises card for manual Add.
   */
  emailPromisesAutoEnabled: boolean
  /**
   * When on: scan recent Primary inbox for meet/call/report asks and
   * fire push / local notifications for new ones.
   */
  meetingEmailAlertsEnabled: boolean
  /**
   * Bill due reminders (local notifications).
   * Default: start 3 days before due, then every day until paid.
   */
  billRemindersEnabled: boolean
  /** First ping this many days before due (0 = due day only) */
  billRemindLeadDays: number
  /** once = only the lead day; daily = every day from lead through due */
  billRemindCadence: BillRemindCadence
  /** HH:MM — when bill reminders fire */
  billRemindTime: string
  /** HH:MM — smart day packer window start (weekdays) */
  workdayStart: string
  /** HH:MM — smart day packer window end (weekdays) */
  workdayEnd: string
  /** Typical week: which days are work, weekend hours, recurring anchors */
  typicalWeek: TypicalWeek
}

/** JS Date#getDay(): 0=Sun … 6=Sat */
export type Dow = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type WeekAnchor = {
  id: string
  title: string
  /** Days this block repeats */
  days: Dow[]
  time: string
  durationMin: number
}

export type TypicalWeek = {
  /** Indexed by Dow — true = full workday hours */
  workDays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean]
  weekendStart: string
  weekendEnd: string
  anchors: WeekAnchor[]
  /** Free-text reminder of how your week usually feels */
  blurb: string
}

export function defaultTypicalWeek(): TypicalWeek {
  return {
    // Sun off, Mon–Fri on, Sat off
    workDays: [false, true, true, true, true, true, false],
    weekendStart: '10:00',
    weekendEnd: '14:00',
    anchors: [],
    blurb: '',
  }
}

export type EmailDigestSender = {
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
  senders: EmailDigestSender[]
  summary: string
  highlights: { fromName: string; subject: string; time?: string }[]
  generatedAt: string
  window?: {
    day: string
    dayLabel: string
    timeZone: string
  }
}

/** Open loop found in the user's own sent mail */
export type EmailPromise = {
  id: string
  messageId: string
  toName: string
  toEmail: string
  subject: string
  promise: string
  suggestedTask: string
  suggestedDate: string | null
  /** Short draft the user can copy or send via Gmail */
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

/** Important ask found in recent incoming mail */
export type MeetingAlert = {
  id: string
  messageId: string
  fromName: string
  fromEmail: string
  subject: string
  intent: 'meet' | 'report' | 'call' | 'other'
  summary: string
  notifyBody: string
  suggestedDate: string | null
  suggestedTime: string | null
  /** Short draft the user can copy or send via Gmail */
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

/** Google Calendar event (primary calendar) */
export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location: string | null
  calendar: string
}

export type CalendarDigest = {
  connected: boolean
  email: string | null
  demo: boolean
  events: CalendarEvent[]
  generatedAt: string
}
