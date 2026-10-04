import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Bill,
  BodyEntry,
  BodyEntryKind,
  ChatMessage,
  ImportantDate,
  ImportantDateKind,
  InvestAssetKind,
  InvestmentHolding,
  LifeAdminItem,
  LifeAdminKind,
  Priority,
  Reminder,
  Task,
  TaskRecurrence,
  UserSettings,
} from '../types'
import { guessKind, normalizeInvestSymbol } from './invest'
import { defaultNewsInterests, defaultTypicalWeek, normalizeNewsInterests } from '../types'
import { deviceLanguageFallback, isAppLanguage } from './i18n'
import { localISODate, localISOMonth } from './localDate'

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
  return localISODate()
}

type PlanDayUndoEntry = {
  id: string
  date: string | null
  time: string | null
}

type NovaState = {
  hydrated: boolean
  demoMode: boolean
  sessionUserId: string | null
  sessionEmail: string | null
  settings: UserSettings
  tasks: Task[]
  bills: Bill[]
  lifeAdmin: LifeAdminItem[]
  bodyEntries: BodyEntry[]
  importantDates: ImportantDate[]
  investments: InvestmentHolding[]
  reminders: Reminder[]
  messages: ChatMessage[]
  dismissedPromiseIds: string[]
  notifiedMeetingIds: string[]
  /** loopId → ISO snoozedUntil (promises + meetings) */
  snoozedLoops: Record<string, string>
  /** Last Plan day arrange snapshot for undo (session only) */
  lastPlanDayUndo: PlanDayUndoEntry[] | null
  /** Settings → Show Morning brief now (ignores time-of-day gate) */
  forceMorningBrief: boolean
  forceWeeklyBrief: boolean
  setHydrated: (v: boolean) => void
  setDemoSession: (email: string, name?: string) => void
  clearSession: () => void
  updateSettings: (patch: Partial<UserSettings>) => void
  setForceMorningBrief: (v: boolean) => void
  setForceWeeklyBrief: (v: boolean) => void
  setTasks: (tasks: Task[]) => void
  upsertTask: (task: Task) => void
  removeTask: (id: string) => void
  setBills: (bills: Bill[]) => void
  upsertBill: (bill: Bill) => void
  removeBill: (id: string) => void
  markBillPaid: (id: string, month?: string) => void
  upsertLifeAdmin: (item: LifeAdminItem) => void
  removeLifeAdmin: (id: string) => void
  createLifeAdminLocal: (input: {
    title: string
    kind?: LifeAdminKind
    expiresOn?: string | null
    provider?: string | null
    notes?: string | null
    remindEnabled?: boolean
  }) => LifeAdminItem
  upsertBodyEntry: (entry: BodyEntry) => void
  removeBodyEntry: (id: string) => void
  createBodyEntryLocal: (input: {
    title: string
    kind?: BodyEntryKind
    date?: string | null
    provider?: string | null
    notes?: string | null
  }) => BodyEntry
  upsertImportantDate: (date: ImportantDate) => void
  removeImportantDate: (id: string) => void
  createImportantDateLocal: (input: {
    title: string
    kind?: ImportantDateKind
    month: number
    day: number
    year?: number | null
    person?: string | null
    notes?: string | null
    remindEnabled?: boolean
    remindLeadDays?: number
  }) => ImportantDate
  upsertInvestment: (holding: InvestmentHolding) => void
  removeInvestment: (id: string) => void
  createInvestmentLocal: (input: {
    symbol: string
    name?: string | null
    kind?: InvestAssetKind
    quantity: number
    costBasisPerUnit: number
    currency?: string
    boughtOn: string
    notes?: string | null
  }) => InvestmentHolding
  patchInvestmentQuotes: (
    quotes: { symbol: string; price: number; name?: string | null; changePct?: number | null }[],
  ) => void
  dismissPromise: (id: string) => void
  snoozeLoop: (id: string, untilISO: string) => void
  clearSnooze: (id: string) => void
  isLoopSnoozed: (id: string) => boolean
  setLastPlanDayUndo: (entries: PlanDayUndoEntry[] | null) => void
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
    recurrence?: TaskRecurrence | null
    sourceKind?: 'promise' | 'meeting' | null
    sourceId?: string | null
  }) => Task
  createBillLocal: (input: {
    title: string
    amount: number
    currency?: string
    dayOfMonth: number
    category?: string
    notes?: string | null
    payHowTo?: string | null
    active?: boolean
    remindEnabled?: boolean
  }) => Bill
}

const defaultSettings: UserSettings = {
  name: '',
  language: 'en',
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
  weeklyBriefEnabled: true,
  lastWeeklyBriefDate: null,
  billRemindersEnabled: true,
  billRemindLeadDays: 3,
  billRemindCadence: 'daily',
  billRemindTime: '09:00',
  promiseRemindDayBefore: true,
  workdayStart: '09:00',
  workdayEnd: '18:00',
  typicalWeek: defaultTypicalWeek(),
  newsInterests: defaultNewsInterests(),
  isPro: false,
  voiceUsedDate: null,
  voiceUsedCount: 0,
  chatUsedDate: null,
  chatUsedCount: 0,
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
      lifeAdmin: [],
      bodyEntries: [],
      importantDates: [],
      investments: [],
      reminders: [],
      messages: [],
      dismissedPromiseIds: [],
      notifiedMeetingIds: [],
      snoozedLoops: {},
      lastPlanDayUndo: null,
      forceMorningBrief: false,
      forceWeeklyBrief: false,
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
          lifeAdmin: [],
          bodyEntries: [],
          importantDates: [],
          investments: [],
          reminders: [],
          messages: [],
          dismissedPromiseIds: [],
          notifiedMeetingIds: [],
          snoozedLoops: {},
          lastPlanDayUndo: null,
          forceMorningBrief: false,
          forceWeeklyBrief: false,
          settings: defaultSettings,
        }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setForceMorningBrief: (v) => set({ forceMorningBrief: v }),
      setForceWeeklyBrief: (v) => set({ forceWeeklyBrief: v }),
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
        const stamp = month || localISOMonth()
        const now = new Date().toISOString()
        set({
          bills: get().bills.map((b) => {
            if (b.id !== id) return b
            const hist = [...(b.paidHistory || [])]
            if (!hist.includes(stamp)) hist.push(stamp)
            return {
              ...b,
              lastPaidMonth: stamp,
              paidHistory: hist.slice(-24),
              updated_at: now,
            }
          }),
        })
      },
      upsertLifeAdmin: (item) => {
        const existing = get().lifeAdmin
        const idx = existing.findIndex((x) => x.id === item.id)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = item
          set({ lifeAdmin: next })
        } else {
          set({ lifeAdmin: [item, ...existing] })
        }
      },
      removeLifeAdmin: (id) => set({ lifeAdmin: get().lifeAdmin.filter((x) => x.id !== id) }),
      createLifeAdminLocal: ({
        title,
        kind = 'other',
        expiresOn = null,
        provider = null,
        notes = null,
        remindEnabled = true,
      }) => {
        const now = new Date().toISOString()
        const item: LifeAdminItem = {
          id: uid('life'),
          title: title.trim() || 'Document',
          kind,
          expiresOn: expiresOn || null,
          provider: provider?.trim() || null,
          notes: notes?.trim() || null,
          remindEnabled: remindEnabled !== false,
          created_at: now,
          updated_at: now,
        }
        set({ lifeAdmin: [item, ...get().lifeAdmin] })
        return item
      },
      upsertBodyEntry: (entry) => {
        const existing = get().bodyEntries
        const idx = existing.findIndex((x) => x.id === entry.id)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = entry
          set({ bodyEntries: next })
        } else {
          set({ bodyEntries: [entry, ...existing] })
        }
      },
      removeBodyEntry: (id) =>
        set({ bodyEntries: get().bodyEntries.filter((x) => x.id !== id) }),
      createBodyEntryLocal: ({
        title,
        kind = 'visit',
        date = null,
        provider = null,
        notes = null,
      }) => {
        const now = new Date().toISOString()
        const entry: BodyEntry = {
          id: uid('body'),
          title: title.trim() || 'Entry',
          kind,
          date: date || null,
          provider: provider?.trim() || null,
          notes: notes?.trim() || null,
          created_at: now,
          updated_at: now,
        }
        set({ bodyEntries: [entry, ...get().bodyEntries] })
        return entry
      },
      upsertImportantDate: (date) => {
        const existing = get().importantDates
        const idx = existing.findIndex((x) => x.id === date.id)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = date
          set({ importantDates: next })
        } else {
          set({ importantDates: [date, ...existing] })
        }
      },
      removeImportantDate: (id) =>
        set({ importantDates: get().importantDates.filter((x) => x.id !== id) }),
      createImportantDateLocal: ({
        title,
        kind = 'birthday',
        month,
        day,
        year = null,
        person = null,
        notes = null,
        remindEnabled = true,
        remindLeadDays = 14,
      }) => {
        const now = new Date().toISOString()
        const date: ImportantDate = {
          id: uid('date'),
          title: title.trim() || 'Date',
          kind,
          month: Math.min(12, Math.max(1, Math.round(month) || 1)),
          day: Math.min(31, Math.max(1, Math.round(day) || 1)),
          year: year && year > 1900 ? year : null,
          person: person?.trim() || null,
          notes: notes?.trim() || null,
          remindEnabled: remindEnabled !== false,
          remindLeadDays: Math.max(0, Math.min(60, Number(remindLeadDays) || 14)),
          created_at: now,
          updated_at: now,
        }
        set({ importantDates: [date, ...get().importantDates] })
        return date
      },
      upsertInvestment: (holding) => {
        const existing = get().investments
        const idx = existing.findIndex((x) => x.id === holding.id)
        if (idx >= 0) {
          const next = [...existing]
          next[idx] = holding
          set({ investments: next })
        } else {
          set({ investments: [holding, ...existing] })
        }
      },
      removeInvestment: (id) =>
        set({ investments: get().investments.filter((x) => x.id !== id) }),
      createInvestmentLocal: ({
        symbol,
        name = null,
        kind,
        quantity,
        costBasisPerUnit,
        currency = 'USD',
        boughtOn,
        notes = null,
      }) => {
        const now = new Date().toISOString()
        const sym = normalizeInvestSymbol(symbol)
        const holding: InvestmentHolding = {
          id: uid('inv'),
          symbol: sym,
          name: name?.trim() || null,
          kind: kind || guessKind(sym),
          quantity: Math.max(0, Number(quantity) || 0),
          costBasisPerUnit: Math.max(0, Number(costBasisPerUnit) || 0),
          currency: (currency || 'USD').trim().toUpperCase() || 'USD',
          boughtOn: boughtOn || localISODate(),
          notes: notes?.trim() || null,
          lastPrice: null,
          lastPriceAt: null,
          lastChangePct: null,
          created_at: now,
          updated_at: now,
        }
        set({ investments: [holding, ...get().investments] })
        return holding
      },
      patchInvestmentQuotes: (quotes) => {
        if (!quotes.length) return
        const bySym = new Map(
          quotes.map((q) => [normalizeInvestSymbol(q.symbol), q] as const),
        )
        const now = new Date().toISOString()
        set({
          investments: get().investments.map((h) => {
            const q =
              bySym.get(normalizeInvestSymbol(h.symbol)) ||
              bySym.get(h.symbol.toUpperCase())
            if (!q) return h
            return {
              ...h,
              lastPrice: q.price,
              lastPriceAt: now,
              lastChangePct: q.changePct ?? h.lastChangePct,
              name: h.name || q.name || null,
              updated_at: now,
            }
          }),
        })
      },
      dismissPromise: (id) =>
        set({
          dismissedPromiseIds: [...new Set([...get().dismissedPromiseIds, id])].slice(-80),
        }),
      snoozeLoop: (id, untilISO) =>
        set({
          snoozedLoops: { ...get().snoozedLoops, [id]: untilISO },
        }),
      clearSnooze: (id) => {
        const next = { ...get().snoozedLoops }
        delete next[id]
        set({ snoozedLoops: next })
      },
      isLoopSnoozed: (id) => {
        const until = get().snoozedLoops[id]
        if (!until) return false
        return new Date(until).getTime() > Date.now()
      },
      setLastPlanDayUndo: (entries) => set({ lastPlanDayUndo: entries }),
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
      createTaskLocal: ({
        title,
        date = null,
        time = null,
        priority = 'medium',
        userId,
        recurrence = null,
        sourceKind = null,
        sourceId = null,
      }) => {
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
          completedAt: null,
          recurrence: recurrence || null,
          sourceKind: sourceKind || null,
          sourceId: sourceId || null,
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
        payHowTo = null,
        active = true,
        remindEnabled = true,
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
          payHowTo: payHowTo?.trim() || null,
          active: active !== false,
          remindEnabled: remindEnabled !== false,
          lastPaidMonth: null,
          paidHistory: [],
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
        lifeAdmin: s.lifeAdmin,
        bodyEntries: s.bodyEntries,
        importantDates: s.importantDates,
        investments: s.investments,
        reminders: s.reminders,
        messages: s.messages,
        dismissedPromiseIds: s.dismissedPromiseIds,
        notifiedMeetingIds: s.notifiedMeetingIds,
        snoozedLoops: s.snoozedLoops,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.settings = { ...defaultSettings, ...state.settings }
          if (!isAppLanguage(state.settings.language)) {
            state.settings.language = deviceLanguageFallback()
          }
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
          state.settings.newsInterests = normalizeNewsInterests(state.settings.newsInterests)
          state.bills = Array.isArray(state.bills) ? state.bills : []
          state.lifeAdmin = Array.isArray(state.lifeAdmin) ? state.lifeAdmin : []
          state.bodyEntries = Array.isArray(state.bodyEntries) ? state.bodyEntries : []
          state.importantDates = Array.isArray(state.importantDates)
            ? state.importantDates
            : []
          state.investments = Array.isArray(state.investments) ? state.investments : []
          state.dismissedPromiseIds = Array.isArray(state.dismissedPromiseIds)
            ? state.dismissedPromiseIds
            : []
          state.notifiedMeetingIds = Array.isArray(state.notifiedMeetingIds)
            ? state.notifiedMeetingIds
            : []
          state.snoozedLoops =
            state.snoozedLoops && typeof state.snoozedLoops === 'object'
              ? state.snoozedLoops
              : {}
          state.lastPlanDayUndo = null
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
