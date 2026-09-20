import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Bill, ChatMessage, Priority, Reminder, Task, UserSettings } from '../types'
import { defaultTypicalWeek } from '../types'

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
  bills: Bill[]
  reminders: Reminder[]
  messages: ChatMessage[]
  dismissedPromiseIds: string[]
  notifiedMeetingIds: string[]
  /** Settings → Show Morning brief now (ignores time-of-day gate) */
  forceMorningBrief: boolean
  setHydrated: (v: boolean) => void
  setDemoSession: (email: string, name?: string) => void
  clearSession: () => void
  updateSettings: (patch: Partial<UserSettings>) => void
  setForceMorningBrief: (v: boolean) => void
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
  setBills: (bills: Bill[]) => void
  upsertBill: (bill: Bill) => void
  removeBill: (id: string) => void
  markBillPaid: (id: string, month?: string) => void
  dismissPromise: (id: string) => void
  markMeetingNotified: (id: string) => void
  dismissMeeting: (id: string) => void
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
  createBillLocal: (input: {
    title: string
    amount: number
    currency?: string
    dayOfMonth: number
    category?: string
    notes?: string | null
  }) => Bill
}

const defaultSettings: UserSettings = {
  name: '',
  notificationsEnabled: true,
  aiTone: 'friendly',
  onboardingComplete: false,
  morningBriefTime: '08:00',
  morningBriefEnabled: true,
  lastMorningBriefDate: null,
  weatherCity: '',
  eveningClearTime: '21:30',
  eveningClearEnabled: true,
  lastEveningClearDate: null,
  emailDigestEnabled: true,
  emailPromisesAutoEnabled: false,
  meetingEmailAlertsEnabled: true,
  workdayStart: '09:00',
  workdayEnd: '18:00',
  typicalWeek: defaultTypicalWeek(),
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
      bills: [],
      reminders: [],
      messages: [],
      dismissedPromiseIds: [],
      notifiedMeetingIds: [],
      forceMorningBrief: false,
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
          bills: [],
          reminders: [],
          messages: [],
          dismissedPromiseIds: [],
          notifiedMeetingIds: [],
          forceMorningBrief: false,
          settings: defaultSettings,
        }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setForceMorningBrief: (v) => set({ forceMorningBrief: v }),
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
      setBills: (bills) => set({ bills }),
      upsertBill: (bill) => {
        const existing = get().bills
        const idx = existing.findIndex((b) => b.id === bill.id)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = bill
          set({ bills: next })
        } else {
          set({ bills: [bill, ...existing] })
        }
      },
      removeBill: (id) => set({ bills: get().bills.filter((b) => b.id !== id) }),
      markBillPaid: (id, month) => {
        const stamp = month || new Date().toISOString().slice(0, 7)
        const now = new Date().toISOString()
        set({
          bills: get().bills.map((b) =>
            b.id === id ? { ...b, lastPaidMonth: stamp, updated_at: now } : b,
          ),
        })
      },
      dismissPromise: (id) =>
        set({
          dismissedPromiseIds: [...new Set([...get().dismissedPromiseIds, id])].slice(-80),
        }),
      markMeetingNotified: (id) =>
        set({
          notifiedMeetingIds: [...new Set([...get().notifiedMeetingIds, id])].slice(-120),
        }),
      dismissMeeting: (id) =>
        set({
          notifiedMeetingIds: [...new Set([...get().notifiedMeetingIds, id])].slice(-120),
        }),
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
      createBillLocal: ({
        title,
        amount,
        currency = 'UAH',
        dayOfMonth,
        category = 'General',
        notes = null,
      }) => {
        const now = new Date().toISOString()
        const day = Math.min(28, Math.max(1, Math.round(dayOfMonth) || 1))
        const bill: Bill = {
          id: uid('bill'),
          title: title.trim() || 'Payment',
          amount: Math.max(0, Number(amount) || 0),
          currency: currency.trim() || 'UAH',
          dayOfMonth: day,
          category: category.trim() || 'General',
          notes: notes?.trim() || null,
          active: true,
          lastPaidMonth: null,
          created_at: now,
          updated_at: now,
        }
        set({ bills: [bill, ...get().bills] })
        return bill
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
        bills: s.bills,
        reminders: s.reminders,
        messages: s.messages,
        dismissedPromiseIds: s.dismissedPromiseIds,
        notifiedMeetingIds: s.notifiedMeetingIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.settings = { ...defaultSettings, ...state.settings }
          state.settings.typicalWeek = {
            ...defaultTypicalWeek(),
            ...(state.settings.typicalWeek || {}),
            workDays:
              state.settings.typicalWeek?.workDays?.length === 7
                ? state.settings.typicalWeek.workDays
                : defaultTypicalWeek().workDays,
            anchors: Array.isArray(state.settings.typicalWeek?.anchors)
              ? state.settings.typicalWeek.anchors
              : [],
          }
          state.bills = Array.isArray(state.bills) ? state.bills : []
          state.dismissedPromiseIds = Array.isArray(state.dismissedPromiseIds)
            ? state.dismissedPromiseIds
            : []
          state.notifiedMeetingIds = Array.isArray(state.notifiedMeetingIds)
            ? state.notifiedMeetingIds
            : []
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
