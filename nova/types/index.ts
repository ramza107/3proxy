export type Priority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string | null
  time: string | null
  priority: Priority
  completed: boolean
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

export type AIChatResponse = {
  reply: string
  actions: AIAction[]
}

export type UserSettings = {
  name: string
  notificationsEnabled: boolean
  aiTone: 'friendly' | 'concise' | 'coach'
  onboardingComplete: boolean
  /** HH:MM — morning brief of today's list */
  morningBriefTime: string
  morningBriefEnabled: boolean
  /** HH:MM — evening clear / prepare tomorrow */
  eveningClearTime: string
  eveningClearEnabled: boolean
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
