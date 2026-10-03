import { Alert } from 'react-native'
import { chatWithNova } from '../lib/api'
import {
  canUseCloudChat,
  chatDailyLimit,
  consumeChatCredit,
  isPro,
} from '../lib/pro'
import { currentMonthKey } from '../lib/bills'
import { fetchCalendarEvents } from '../lib/googleApi'
import { scheduleTaskNotification, cancelNotification, syncBillReminders } from '../lib/notifications'
import { firstOccurrenceDate, nextOccurrenceDate } from '../lib/recurrence'
import { isDestructiveAction, sanitizeAIActions } from '../lib/sanitizeActions'
import { isOrganizeDayIntent, planDayActions } from '../lib/scheduleDay'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { todayISO, uid, useNovaStore } from '../lib/store'
import { refreshWidgetSnapshot } from '../lib/widgetSync'
import { clientLocalAI } from './localAI'
import type { AIAction, AIChatResponse, Priority, Reminder, Task, TaskRecurrence } from '../types'

async function createTaskRemote(
  userId: string,
  action: Extract<AIAction, { type: 'create_task' }>,
) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: action.title,
      date: action.date,
      time: action.time,
      priority: action.priority,
    })
    .select('*')
    .single()
  if (error) throw error
  const task = data as Task
  if (action.recurrence) {
    return { ...task, recurrence: action.recurrence }
  }
  return task
}

async function updateTaskRemote(action: Extract<AIAction, { type: 'update_task' }>) {
  const supabase = getSupabase()
  if (!supabase) return null
  const patch: Record<string, unknown> = {}
  if (action.title !== undefined) patch.title = action.title
  if (action.date !== undefined) patch.date = action.date
  if (action.time !== undefined) patch.time = action.time
  if (action.priority !== undefined) patch.priority = action.priority
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', action.task_id)
    .select('*')
    .single()
  if (error) throw error
  return data as Task
}

export async function applyActions(
  actions: AIAction[],
  userId: string,
  notificationsEnabled: boolean,
) {
  const store = useNovaStore.getState()
  const useRemote = isSupabaseConfigured && !store.demoMode

  for (const action of actions) {
    if (action.type === 'create_task') {
      let date = action.date
      const recurrence: TaskRecurrence | null = action.recurrence || null
      if (recurrence && !date) {
        date = firstOccurrenceDate(todayISO(), recurrence)
      } else if (recurrence && date) {
        date = firstOccurrenceDate(date, recurrence)
      }
      let task: Task | null = null
      const createPayload = { ...action, date, recurrence }
      if (useRemote) {
        try {
          task = await createTaskRemote(userId, createPayload)
        } catch {
          task = null
        }
      }
      if (!task) {
        task = store.createTaskLocal({
          title: action.title,
          date,
          time: action.time,
          priority: action.priority,
          userId,
          recurrence,
        })
      } else {
        store.upsertTask({ ...task, recurrence: recurrence || task.recurrence || null })
      }
      await scheduleTaskNotification(task, notificationsEnabled)
    }

    if (action.type === 'update_task') {
      let task: Task | null = null
      if (useRemote) {
        try {
          task = await updateTaskRemote(action)
        } catch {
          task = null
        }
      }
      const local = store.tasks.find((t) => t.id === action.task_id)
      if (!task && local) {
        task = {
          ...local,
          title: action.title ?? local.title,
          date: action.date === undefined ? local.date : action.date,
          time: action.time === undefined ? local.time : action.time,
          priority: action.priority ?? local.priority,
          updated_at: new Date().toISOString(),
        }
      }
      if (task) {
        store.upsertTask(task)
        await scheduleTaskNotification(task, notificationsEnabled)
      }
    }

    if (action.type === 'complete_task') {
      const local = store.tasks.find((t) => t.id === action.task_id)
      if (useRemote) {
        const supabase = getSupabase()
        await supabase?.from('tasks').update({ completed: true }).eq('id', action.task_id)
      }
      if (local) {
        const now = new Date().toISOString()
        store.upsertTask({
          ...local,
          completed: true,
          completedAt: now,
          updated_at: now,
        })
        if (local.recurrence) {
          const base = local.date || todayISO()
          const nextDate = nextOccurrenceDate(base, local.recurrence)
          store.createTaskLocal({
            title: local.title,
            date: nextDate,
            time: local.time,
            priority: local.priority,
            userId: local.user_id,
            recurrence: local.recurrence,
          })
        }
      }
    }

    if (action.type === 'delete_task') {
      if (useRemote) {
        const supabase = getSupabase()
        await supabase?.from('tasks').delete().eq('id', action.task_id)
      }
      store.removeTask(action.task_id)
    }

    if (action.type === 'create_reminder') {
      const scheduled_for = `${action.date}T${action.time}:00`
      const reminder: Reminder = {
        id: uid('rem'),
        user_id: userId,
        task_id: action.task_id ?? null,
        title: action.title,
        scheduled_for,
        completed: false,
        created_at: new Date().toISOString(),
      }

      if (useRemote) {
        const supabase = getSupabase()
        if (supabase) {
          const { data } = await supabase
            .from('reminders')
            .insert({
              user_id: userId,
              task_id: action.task_id ?? null,
              title: action.title,
              scheduled_for,
            })
            .select('*')
            .single()
          if (data) {
            store.addReminder(data as Reminder)
          } else {
            store.addReminder(reminder)
          }
        } else {
          store.addReminder(reminder)
        }
      } else {
        store.addReminder(reminder)
      }

      // Also mirror as a timed task for visibility in Today/Upcoming
      const mirrored = store.createTaskLocal({
        title: action.title,
        date: action.date,
        time: action.time,
        priority: 'high',
        userId,
      })
      await scheduleTaskNotification(mirrored, notificationsEnabled)
    }

    if (action.type === 'create_bill') {
      store.createBillLocal({
        title: action.title,
        amount: action.amount,
        currency: action.currency || 'UAH',
        dayOfMonth: action.dayOfMonth,
        category: action.category || 'General',
        payHowTo: action.payHowTo ?? null,
      })
      await syncBillReminders(useNovaStore.getState().bills, store.settings)
    }

    if (action.type === 'mark_bill_paid') {
      const hint = (action.title_hint || '').toLowerCase().trim()
      const bill =
        (action.bill_id && store.bills.find((b) => b.id === action.bill_id)) ||
        (hint ? store.bills.find((b) => b.title.toLowerCase().includes(hint)) : null)
      if (bill) {
        store.markBillPaid(bill.id, action.month || currentMonthKey())
        await syncBillReminders(useNovaStore.getState().bills, store.settings)
      }
    }

    if (action.type === 'create_calendar_event') {
      // Local timed task only — Google Calendar is read-only.
      const task = store.createTaskLocal({
        title: action.title,
        date: action.date,
        time: action.time,
        priority: 'high',
        userId,
      })
      await scheduleTaskNotification(task, notificationsEnabled)
    }
  }

  await refreshWidgetSnapshot().catch(() => undefined)
}

export type CalendarCandidate = {
  title: string
  start: string
  end: string
}

/** Snapshot tasks before destructive apply so Undo can restore. */
type DestructiveSnapshot = {
  action: Extract<AIAction, { type: 'complete_task' | 'delete_task' }>
  task: Task
}

function confirmDestructiveActions(
  snapshots: DestructiveSnapshot[],
  userId: string,
  notificationsEnabled: boolean,
): Promise<AIAction[]> {
  if (!snapshots.length) return Promise.resolve([])

  const labels = snapshots.map((s) => {
    const verb = s.action.type === 'delete_task' ? 'Delete' : 'Complete'
    return `${verb} “${s.task.title}”`
  })
  const title = snapshots.length === 1 ? labels[0] : `Apply ${snapshots.length} changes?`
  const body =
    snapshots.length === 1
      ? snapshots[0].action.type === 'delete_task'
        ? 'This removes the task from Tasks.'
        : 'Mark this task done?'
      : labels.join('\n')

  return new Promise((resolve) => {
    Alert.alert(title, body, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve([]),
      },
      {
        text: 'Confirm',
        style: snapshots.some((s) => s.action.type === 'delete_task') ? 'destructive' : 'default',
        onPress: () => {
          void (async () => {
            const actions = snapshots.map((s) => s.action)
            await applyActions(actions, userId, notificationsEnabled)
            offerUndoDestructive(snapshots, notificationsEnabled)
            resolve(actions)
          })()
        },
      },
    ])
  })
}

function offerUndoDestructive(snapshots: DestructiveSnapshot[], notificationsEnabled: boolean) {
  const store = useNovaStore.getState()
  Alert.alert('Done', 'Undo?', [
    { text: 'Keep', style: 'cancel' },
    {
      text: 'Undo',
      style: 'default',
      onPress: () => {
        void (async () => {
          for (const snap of snapshots) {
            if (snap.action.type === 'complete_task') {
              if (snap.task.recurrence) {
                const spawned = useNovaStore
                  .getState()
                  .tasks.find(
                    (t) =>
                      t.id !== snap.task.id &&
                      !t.completed &&
                      t.title === snap.task.title &&
                      Boolean(t.recurrence) &&
                      t.created_at >= snap.task.updated_at,
                  )
                if (spawned) store.removeTask(spawned.id)
              }
              const restored = {
                ...snap.task,
                completed: false,
                updated_at: new Date().toISOString(),
              }
              if (isSupabaseConfigured && !store.demoMode) {
                const supabase = getSupabase()
                await supabase?.from('tasks').update({ completed: false }).eq('id', snap.task.id)
              }
              store.upsertTask(restored)
              await scheduleTaskNotification(restored, notificationsEnabled)
            }
            if (snap.action.type === 'delete_task') {
              store.upsertTask({ ...snap.task, updated_at: new Date().toISOString() })
              await scheduleTaskNotification(snap.task, notificationsEnabled)
            }
          }
          await refreshWidgetSnapshot().catch(() => undefined)
        })()
      },
    },
  ])
}

export async function refreshTasks(userId: string) {
  const store = useNovaStore.getState()
  if (!isSupabaseConfigured || store.demoMode) return
  const supabase = getSupabase()
  const { data, error } = await supabase!
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  if (!error && data) {
    useNovaStore.getState().setTasks(data as Task[])
  }
}

export type OrganizeMyDayResult = AIChatResponse & {
  calendarCandidates: CalendarCandidate[]
}

export async function organizeMyDay(opts?: {
  includeUndated?: boolean
  /** Task ids to leave alone (protected in Plan day triage) */
  skipTaskIds?: string[]
}): Promise<OrganizeMyDayResult> {
  const store = useNovaStore.getState()
  const userId = store.sessionUserId
  if (!userId) throw new Error('Not signed in')

  const day = todayISO()
  let calendarBusy: { start: number; end: number; title: string }[] = []
  try {
    const from = `${day}T00:00:00`
    const to = `${day}T23:59:59`
    const digest = await fetchCalendarEvents(userId, { from, to })
    calendarBusy = (digest.events || [])
      .filter((e) => !e.allDay)
      .map((e) => {
        const start = new Date(e.start)
        const end = new Date(e.end)
        return {
          start: start.getHours() * 60 + start.getMinutes(),
          end: Math.max(
            start.getHours() * 60 + start.getMinutes() + 15,
            end.getHours() * 60 + end.getMinutes(),
          ),
          title: e.title,
        }
      })
      .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end))
  } catch {
    calendarBusy = []
  }

  const planned = planDayActions({
    tasks: store.tasks,
    day,
    settings: store.settings,
    includeUndated: opts?.includeUndated !== false,
    skipTaskIds: opts?.skipTaskIds,
    calendarBusy,
  })

  if (planned.actions.length) {
    const snapshots = planned.actions
      .map((a) => {
        const t = store.tasks.find((x) => x.id === a.task_id)
        if (!t) return null
        return { id: t.id, date: t.date, time: t.time }
      })
      .filter((x): x is { id: string; date: string | null; time: string | null } => !!x)
    store.setLastPlanDayUndo(snapshots.length ? snapshots : null)
    await applyActions(planned.actions, userId, store.settings.notificationsEnabled)
  } else {
    store.setLastPlanDayUndo(null)
  }

  return {
    reply: planned.summary,
    actions: planned.actions,
    calendarCandidates: [],
  }
}

export async function sendNovaMessage(message: string): Promise<AIChatResponse> {
  const store = useNovaStore.getState()
  const userId = store.sessionUserId
  if (!userId) throw new Error('Not signed in')

  store.addMessage({ role: 'user', content: message })

  let response: AIChatResponse | OrganizeMyDayResult

  // Smart day packer — local, free for everyone
  if (isOrganizeDayIntent(message)) {
    const planned = await organizeMyDay()
    store.addMessage({ role: 'assistant', content: planned.reply })
    return planned
  }

  // Free: on-device local AI only — $0 cloud. Pro: cloud LLM with fair-use.
  if (!canUseCloudChat()) {
    if (isPro()) {
      const n = chatDailyLimit()
      const reply =
        store.settings.language === 'ru'
          ? `Дневной лимит Pro-чата — ${n}. Завтра снова.`
          : `Pro daily chat fair-use is ${n}. Try again tomorrow.`
      store.addMessage({ role: 'assistant', content: reply })
      return { reply, actions: [] }
    }
    response = clientLocalAI(message, store.tasks, store.bills)
  } else {
    const history = store.messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
    let accessToken: string | null = null
    if (isSupabaseConfigured && !store.demoMode) {
      const supabase = getSupabase()
      const { data } = await supabase!.auth.getSession()
      accessToken = data.session?.access_token ?? null
    }

    try {
      response = await chatWithNova({
        message,
        userId,
        userName: store.settings.name,
        tasks: store.tasks,
        bills: store.bills,
        history,
        accessToken,
        aiTone: store.settings.aiTone,
        isPro: true,
      })
      consumeChatCredit()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (/chat_limit|chat limit|Pro daily|Wahrly Pro/i.test(msg)) {
        const n = chatDailyLimit()
        const reply =
          store.settings.language === 'ru'
            ? `Дневной лимит Pro-чата — ${n}. Завтра снова.`
            : `Pro daily chat fair-use is ${n}. Try again tomorrow.`
        store.addMessage({ role: 'assistant', content: reply })
        return { reply, actions: [] }
      }
      response = clientLocalAI(message, store.tasks, store.bills)
    }
  }

  const actions = sanitizeAIActions(response.actions || [], store.tasks, store.bills)
  const safe = actions.filter((a) => !isDestructiveAction(a))
  const destructive = actions.filter(isDestructiveAction) as Extract<
    AIAction,
    { type: 'complete_task' | 'delete_task' }
  >[]

  store.addMessage({ role: 'assistant', content: response.reply })
  await applyActions(safe, userId, store.settings.notificationsEnabled)

  let appliedDestructive: AIAction[] = []
  if (destructive.length) {
    const snapshots: DestructiveSnapshot[] = []
    for (const action of destructive) {
      const task = store.tasks.find((t) => t.id === action.task_id)
      if (task) snapshots.push({ action, task: { ...task } })
    }
    appliedDestructive = await confirmDestructiveActions(
      snapshots,
      userId,
      store.settings.notificationsEnabled,
    )
  }

  return { ...response, actions: [...safe, ...appliedDestructive] }
}

export async function undoLastPlanDay(): Promise<number> {
  const store = useNovaStore.getState()
  const snaps = store.lastPlanDayUndo
  if (!snaps?.length) return 0
  let n = 0
  for (const snap of snaps) {
    const task = store.tasks.find((t) => t.id === snap.id)
    if (!task) continue
    await updateTaskFields(task, { date: snap.date, time: snap.time })
    n += 1
  }
  store.setLastPlanDayUndo(null)
  await refreshWidgetSnapshot().catch(() => undefined)
  return n
}

export async function toggleTaskCompleted(task: Task) {
  const store = useNovaStore.getState()
  const completing = !task.completed
  const now = new Date().toISOString()
  const next = {
    ...task,
    completed: completing,
    completedAt: completing ? now : null,
    updated_at: now,
  }
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    await supabase?.from('tasks').update({ completed: next.completed }).eq('id', task.id)
  }
  store.upsertTask(next)

  // Spawn next occurrence when completing a recurring task
  if (completing && task.recurrence) {
    const base = task.date || todayISO()
    const { nextOccurrenceDate } = await import('../lib/recurrence')
    const nextDate = nextOccurrenceDate(base, task.recurrence)
    store.createTaskLocal({
      title: task.title,
      date: nextDate,
      time: task.time,
      priority: task.priority,
      userId: task.user_id,
      recurrence: task.recurrence,
    })
  }
  await refreshWidgetSnapshot().catch(() => undefined)
}

export async function updateTaskFields(
  task: Task,
  patch: Partial<Pick<Task, 'title' | 'date' | 'time' | 'priority' | 'recurrence'>>,
) {
  const store = useNovaStore.getState()
  const next = { ...task, ...patch, updated_at: new Date().toISOString() }
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    await supabase?.from('tasks').update(patch).eq('id', task.id)
  }
  store.upsertTask(next)
  await scheduleTaskNotification(next, store.settings.notificationsEnabled)
  await refreshWidgetSnapshot().catch(() => undefined)
}

export async function deleteTask(taskId: string) {
  const store = useNovaStore.getState()
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    await supabase?.from('tasks').delete().eq('id', taskId)
  }
  store.removeTask(taskId)
  await cancelNotification(null)
  await refreshWidgetSnapshot().catch(() => undefined)
}

export function matchTaskByTitle(tasks: Task[], hint: string) {
  const q = hint.toLowerCase()
  return tasks.find((t) => !t.completed && t.title.toLowerCase().includes(q))
}

export type { Priority } from '../types'
