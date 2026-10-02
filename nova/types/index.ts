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
  /** ISO timestamp when marked complete (for evening digest) */
  completedAt?: string | null
  /** When set, completing spawns the next occurrence */
  recurrence?: TaskRecurrence | null
  /**
   * Social loop kind — first-class, not a plain task:
   * `promise` = I owe someone; `meeting` = Waiting on someone.
   * May originate from Gmail or be created manually.
   */
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
   * Pro feature — Free users stay on manual Add.
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
  /** Day-before local push for dated promise tasks */
  promiseRemindDayBefore: boolean
  /** HH:MM — smart day packer window start (weekdays) */
  workdayStart: string
  /** HH:MM — smart day packer window end (weekdays) */
  workdayEnd: string
  /** Typical week: which days are work, weekend hours, recurring anchors */
  typicalWeek: TypicalWeek
  /** Interest filters for the News tab (yesterday digest) */
  newsInterests: NewsInterest[]
  /**
   * Wahrly Pro (demo toggle until StoreKit / RevenueCat).
   * Unlocks auto-promises, weekly brief, higher voice/chat fair-use.
   */
  isPro: boolean
  /** YYYY-MM-DD — day voice credits were last consumed */
  voiceUsedDate: string | null
  /** Voice transcripts used on voiceUsedDate */
  voiceUsedCount: number
  /** YYYY-MM-DD — day AI chat credits were last consumed */
  chatUsedDate: string | null
  /** AI chat turns used on chatUsedDate */
  chatUsedCount: number
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

export const NEWS_INTERESTS = [
  'world',
  'tech',
  'business',
  'science',
  'sports',
  'culture',
  'health',
] as const

export type NewsInterest = (typeof NEWS_INTERESTS)[number]

export function defaultNewsInterests(): NewsInterest[] {
  return ['world', 'tech', 'business']
}

export function normalizeNewsInterests(raw?: string[] | null): NewsInterest[] {
  const allowed = new Set<string>(NEWS_INTERESTS)
  const picked = (raw || []).filter((x): x is NewsInterest => allowed.has(x))
  return picked.length ? [...new Set(picked)] : defaultNewsInterests()
}

export type NewsItem = {
  id: string
  title: string
  url: string
  source: string
  interest: NewsInterest
  publishedAt: string
}

export type YesterdayNewsDigest = {
  demo: boolean
  day: string
  dayLabel: string
  timeZone: string
  interests: NewsInterest[]
  items: NewsItem[]
  /** Target stories per interest section (server hint) */
  perSection?: number
  summary: string
  generatedAt: string
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
  /** Short draft the user can copy into Gmail */
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
  /** Short draft the user can copy into Gmail */
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

/** Life Admin — passports, insurance, contracts, renewals */
export const LIFE_ADMIN_KINDS = [
  'passport',
  'id',
  'insurance',
  'visa',
  'contract',
  'subscription',
  'warranty',
  'other',
] as const

export type LifeAdminKind = (typeof LIFE_ADMIN_KINDS)[number]

export type LifeAdminItem = {
  id: string
  title: string
  kind: LifeAdminKind
  /** YYYY-MM-DD expiry / renewal */
  expiresOn: string | null
  provider: string | null
  notes: string | null
  remindEnabled: boolean
  created_at: string
  updated_at: string
}

/** Body — personal medical timeline */
export const BODY_ENTRY_KINDS = [
  'visit',
  'diagnosis',
  'medication',
  'allergy',
  'vaccine',
  'lab',
  'other',
] as const

export type BodyEntryKind = (typeof BODY_ENTRY_KINDS)[number]

export type BodyEntry = {
  id: string
  title: string
  kind: BodyEntryKind
  /** YYYY-MM-DD when it happened / started */
  date: string | null
  provider: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** Birthdays, holidays, anniversaries — yearly reminders */
export const IMPORTANT_DATE_KINDS = ['birthday', 'holiday', 'anniversary', 'other'] as const

export type ImportantDateKind = (typeof IMPORTANT_DATE_KINDS)[number]

export type ImportantDate = {
  id: string
  title: string
  kind: ImportantDateKind
  /** Calendar month 1–12 */
  month: number
  /** Day of month 1–31 */
  day: number
  /** Optional year (birth year / first anniversary) */
  year: number | null
  person: string | null
  notes: string | null
  remindEnabled: boolean
  /** Days before to notify — default 14 */
  remindLeadDays: number
  created_at: string
  updated_at: string
}
