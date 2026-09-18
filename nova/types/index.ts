export type Priority = 'low' | 'medium' | 'high'

/** Shopping / packing line inside a task */
export type ChecklistItem = {
  id: string
  text: string
  done: boolean
}

/** Monthly cycle: same calendar day each month (clamped for short months) */
export type TaskRecurrence = {
  type: 'monthly'
  dayOfMonth: number
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
  checklist: ChecklistItem[]
  recurrence: TaskRecurrence | null
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
      checklist?: string[] | null
      recurrence?: TaskRecurrence | null
    }
  | {
      type: 'update_task'
      task_id: string
      title?: string
      date?: string | null
      time?: string | null
      priority?: Priority
      checklist?: string[] | null
      recurrence?: TaskRecurrence | null
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
