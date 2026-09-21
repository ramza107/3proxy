import { Alert } from 'react-native'
import { chatWithNova } from '../lib/api'
import { isCheckEmailIntent, replyFromEmailCheck } from '../lib/checkEmail'
import { currentMonthKey } from '../lib/bills'
import { createCalendarEvent, fetchCalendarEvents } from '../lib/emailApi'
import { scheduleTaskNotification, cancelNotification, syncBillReminders } from '../lib/notifications'
import { durationForPriority, isOrganizeDayIntent, planDayActions, parseHmToMinutes } from '../lib/scheduleDay'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { todayISO, uid, useNovaStore } from '../lib/store'
import { refreshWidgetSnapshot } from '../lib/widgetSync'
import { clientLocalAI } from './localAI'
import type { AIAction, AIChatResponse, Priority, Reminder, Task } from '../types'

async function createTaskRemote(userId: string, action: Extract<AIAction, { type: 'create_task' }>) {
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
  return data as Task
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
      let task: Task | null = null
      if (useRemote) {
        try {
          task = await createTaskRemote(userId, action)
        } catch {
          task = null
        }
      }
      if (!task) {
        task = store.createTaskLocal({
          title: action.title,
          date: action.date,
          time: action.time,
          priority: action.priority,
          userId,
        })
      } else {
        store.upsertTask(task)
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
        store.upsertTask({
          ...local,
          completed: true,
          updated_at: new Date().toISOString(),
        })
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
        (hint
          ? store.bills.find((b) => b.title.toLowerCase().includes(hint))
          : null)
      if (bill) {
        store.markBillPaid(bill.id, action.month || currentMonthKey())
        await syncBillReminders(useNovaStore.getState().bills, store.settings)
      }
    }

    if (action.type === 'create_calendar_event') {
      // Local timed task only — Google write happens after explicit confirm (Plan day).
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

export type CalendarCandidate = {
  title: string
  start: string
  end: string
}

export type OrganizeMyDayResult = AIChatResponse & {
  calendarCandidates: CalendarCandidate[]
}

/** Push previously planned timed tasks to Google Calendar (after user confirms). */
export async function syncPlannedTasksToCalendar(
  candidates: CalendarCandidate[],
): Promise<{ ok: number; failed: number }> {
  const store = useNovaStore.getState()
  const userId = store.sessionUserId
  if (!userId || !candidates.length) return { ok: 0, failed: 0 }

  let ok = 0
  let failed = 0
  for (const c of candidates) {
    try {
      await createCalendarEvent(userId, {
        title: c.title,
        start: c.start,
        end: c.end,
        description: 'Scheduled by Wahrly Plan day',
      })
      ok += 1
    } catch {
      failed += 1
    }
  }
  return { ok, failed }
}

function candidatesFromPlanActions(
  actions: Extract<AIAction, { type: 'update_task' }>[],
): CalendarCandidate[] {
  const latest = useNovaStore.getState().tasks
  const out: CalendarCandidate[] = []
  const pad = (n: number) => String(n).padStart(2, '0')
  for (const action of actions) {
    const task = latest.find((t) => t.id === action.task_id)
    if (!task?.date || !task.time) continue
    const dur = durationForPriority(task.priority)
    const startMin = parseHmToMinutes(task.time)
    if (startMin == null) continue
    const endMin = startMin + dur
    const endH = Math.floor(endMin / 60) % 24
    const endM = endMin % 60
    out.push({
      title: task.title,
      start: `${task.date}T${task.time}:00`,
      end: `${task.date}T${pad(endH)}:${pad(endM)}:00`,
    })
  }
  return out
}

export async function organizeMyDay(opts?: {
  includeUndated?: boolean
  /** Task ids to leave alone (protected in Plan day triage) */
  skipTaskIds?: string[]
  /**
   * If true, write to Google Calendar immediately (legacy).
   * Default false — return calendarCandidates for a confirm step.
   */
  syncCalendar?: boolean
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
    await applyActions(planned.actions, userId, store.settings.notificationsEnabled)
  }

  const calendarCandidates = candidatesFromPlanActions(planned.actions)

  if (opts?.syncCalendar === true && calendarCandidates.length) {
    await syncPlannedTasksToCalendar(calendarCandidates)
  }

  return {
    reply: planned.summary,
    actions: planned.actions,
    calendarCandidates: opts?.syncCalendar === true ? [] : calendarCandidates,
  }
}

/** Ask before writing Plan day blocks to Google Calendar. */
export function confirmAddToGoogleCalendar(
  candidates: CalendarCandidate[],
  onDone?: (result: { ok: number; failed: number }) => void,
) {
  if (!candidates.length) return
  const n = candidates.length
  Alert.alert(
    'Google Calendar',
    `Add ${n} planned block${n === 1 ? '' : 's'} to Google Calendar?`,
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Add',
        style: 'default',
        onPress: () => {
          void syncPlannedTasksToCalendar(candidates).then((result) => {
            if (result.failed && !result.ok) {
              Alert.alert(
                'Calendar',
                'Could not add events — reconnect Google in Settings (calendar write).',
              )
            } else if (result.ok) {
              Alert.alert(
                'Calendar',
                result.failed
                  ? `Added ${result.ok}. ${result.failed} failed.`
                  : `Added ${result.ok} to Google Calendar.`,
              )
            }
            onDone?.(result)
          })
        },
      },
    ],
  )
}

export async function sendNovaMessage(message: string): Promise<AIChatResponse> {
  const store = useNovaStore.getState()
  const userId = store.sessionUserId
  if (!userId) throw new Error('Not signed in')

  store.addMessage({ role: 'user', content: message })

  let response: AIChatResponse | OrganizeMyDayResult

  // Real Gmail check — don't fall through to the Tasks canned reply
  if (isCheckEmailIntent(message)) {
    response = await replyFromEmailCheck(userId, message)
    store.addMessage({ role: 'assistant', content: response.reply })
    return response
  }

  // Smart day packer — Motion-style slot filling for today's tasks
  if (isOrganizeDayIntent(message)) {
    const planned = await organizeMyDay()
    store.addMessage({ role: 'assistant', content: planned.reply })
    if (planned.calendarCandidates.length) {
      confirmAddToGoogleCalendar(planned.calendarCandidates)
    }
    return planned
  }

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
    })
  } catch {
    response = clientLocalAI(message, store.tasks, store.bills)
  }

  store.addMessage({ role: 'assistant', content: response.reply })
  await applyActions(response.actions || [], userId, store.settings.notificationsEnabled)
  return response
}

export async function toggleTaskCompleted(task: Task) {
  const store = useNovaStore.getState()
  const completing = !task.completed
  const next = {
    ...task,
    completed: completing,
    updated_at: new Date().toISOString(),
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
}

export async function deleteTask(taskId: string) {
  const store = useNovaStore.getState()
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    await supabase?.from('tasks').delete().eq('id', taskId)
  }
  store.removeTask(taskId)
  await cancelNotification(null)
}

export function matchTaskByTitle(tasks: Task[], hint: string) {
  const q = hint.toLowerCase()
  return tasks.find((t) => !t.completed && t.title.toLowerCase().includes(q))
}

export type { Priority }
