import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ChatMessage, Priority, Reminder, Task, UserSettings } from '../types'

const ssrSafeStorage = {
  getItem: async (_name: string) => null as string | null,
  setItem: async (_name: string, _value: string) => undefined,
  removeItem: async (_name: string) => undefined,
}

function storeStorage() {
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    return createJSONStorage(() => ssrSafeStorage)
  }
  return createJSONStorage(() => AsyncStorage)
}

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

type NovaState = {
  hydrated: boolean
  demoMode: boolean
  sessionUserId: string | null
  sessionEmail: string | null
  settings: UserSettings
  tasks: Task[]
  reminders: Reminder[]
  messages: ChatMessage[]
  setHydrated: (v: boolean) => void
  setDemoSession: (email: string, name?: string) => void
  clearSession: () => void
  updateSettings: (patch: Partial<UserSettings>) => void
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
  addReminder: (reminder: Reminder) => void
  addMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'> & Partial<ChatMessage>) => void
  clearMessages: () => void
  createTaskLocal: (input: {
    title: string
    date?: string | null
    time?: string | null
    priority?: Priority
    userId: string
  }) => Task
}

const defaultSettings: UserSettings = {
  name: '',
  notificationsEnabled: true,
  aiTone: 'friendly',
  onboardingComplete: false,
  morningBriefTime: '08:00',
  morningBriefEnabled: true,
  eveningClearTime: '21:30',
  eveningClearEnabled: true,
  emailDigestEnabled: true,
}

export const useNovaStore = create<NovaState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      demoMode: true,
      sessionUserId: null,
      sessionEmail: null,
      settings: defaultSettings,
      tasks: [],
      reminders: [],
      messages: [],
      setHydrated: (v) => set({ hydrated: v }),
      setDemoSession: (email, name) =>
        set({
          demoMode: true,
          sessionUserId: get().sessionUserId || uid('user'),
          sessionEmail: email,
          settings: {
            ...get().settings,
            name: name || get().settings.name || email.split('@')[0],
          },
        }),
      clearSession: () =>
        set({
          sessionUserId: null,
          sessionEmail: null,
          tasks: [],
          reminders: [],
          messages: [],
          settings: defaultSettings,
        }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setTasks: (tasks) => set({ tasks }),
      upsertTask: (task) => {
        const existing = get().tasks
        const idx = existing.findIndex((t) => t.id === task.id)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = task
          set({ tasks: next })
        } else {
          set({ tasks: [task, ...existing] })
        }
      },
      removeTask: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),
      addReminder: (reminder) => set({ reminders: [reminder, ...get().reminders] }),
      addMessage: (message) =>
        set({
          messages: [
            ...get().messages,
            {
              id: message.id || uid('msg'),
              role: message.role,
              content: message.content,
              createdAt: message.createdAt || new Date().toISOString(),
            },
          ],
        }),
      clearMessages: () => set({ messages: [] }),
      createTaskLocal: ({ title, date = null, time = null, priority = 'medium', userId }) => {
        const now = new Date().toISOString()
        const task: Task = {
          id: uid('task'),
          user_id: userId,
          title,
          description: null,
          date,
          time,
          priority,
          completed: false,
          created_at: now,
          updated_at: now,
        }
        set({ tasks: [task, ...get().tasks] })
        return task
      },
    }),
    {
      name: 'nova-store-v1',
      storage: storeStorage(),
      partialize: (s) => ({
        demoMode: s.demoMode,
        sessionUserId: s.sessionUserId,
        sessionEmail: s.sessionEmail,
        settings: s.settings,
        tasks: s.tasks,
        reminders: s.reminders,
        messages: s.messages,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.settings = { ...defaultSettings, ...state.settings }
          state.setHydrated(true)
        }
      },
    },
  ),
)

export function sortTasks(tasks: Task[]) {
  const weight = { high: 0, medium: 1, low: 2 }
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const da = a.date || '9999-99-99'
    const db = b.date || '9999-99-99'
    if (da !== db) return da.localeCompare(db)
    const ta = a.time || '99:99'
    const tb = b.time || '99:99'
    if (ta !== tb) return ta.localeCompare(tb)
    return weight[a.priority] - weight[b.priority]
  })
}

export function tasksForDay(tasks: Task[], day = todayISO()) {
  return sortTasks(tasks.filter((t) => !t.completed && t.date === day))
}

export { todayISO, uid }
