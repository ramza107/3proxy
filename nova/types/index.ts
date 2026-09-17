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
}
