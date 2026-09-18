import { chatWithNova } from '../lib/api'
import { scheduleTaskNotification, cancelNotification } from '../lib/notifications'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { uid, useNovaStore } from '../lib/store'
import {
  advanceMonthlyDate,
  checklistFromStrings,
  nextMonthlyDate,
  normalizeChecklist,
  normalizeRecurrence,
  normalizeTask,
  resetChecklist,
} from '../lib/taskExtras'
import { clientLocalAI } from './localAI'
import type { AIAction, AIChatResponse, ChecklistItem, Priority, Reminder, Task, TaskRecurrence } from '../types'

function taskPayloadFromCreate(action: Extract<AIAction, { type: 'create_task' }>) {
  return {
    title: action.title,
    date: action.date,
    time: action.time,
    priority: action.priority,
    checklist: checklistFromStrings(action.checklist || []),
    recurrence: normalizeRecurrence(action.recurrence),
  }
}

async function createTaskRemote(userId: string, action: Extract<AIAction, { type: 'create_task' }>) {
  const supabase = getSupabase()
  if (!supabase) return null
  const extras = taskPayloadFromCreate(action)
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: extras.title,
      date: extras.date,
      time: extras.time,
      priority: extras.priority,
      checklist: extras.checklist,
      recurrence: extras.recurrence,
    })
    .select('*')
    .single()
  if (error) throw error
  return normalizeTask(data as Task)
}

async function updateTaskRemote(action: Extract<AIAction, { type: 'update_task' }>) {
  const supabase = getSupabase()
  if (!supabase) return null
  const patch: Record<string, unknown> = {}
  if (action.title !== undefined) patch.title = action.title
  if (action.date !== undefined) patch.date = action.date
  if (action.time !== undefined) patch.time = action.time
  if (action.priority !== undefined) patch.priority = action.priority
  if (action.checklist !== undefined) patch.checklist = checklistFromStrings(action.checklist || [])
  if (action.recurrence !== undefined) patch.recurrence = normalizeRecurrence(action.recurrence)
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', action.task_id)
    .select('*')
    .single()
  if (error) throw error
  return normalizeTask(data as Task)
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
          checklist: action.checklist,
          recurrence: action.recurrence || null,
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
        task = normalizeTask({
          ...local,
          title: action.title ?? local.title,
          date: action.date === undefined ? local.date : action.date,
          time: action.time === undefined ? local.time : action.time,
          priority: action.priority ?? local.priority,
          checklist:
            action.checklist === undefined
              ? local.checklist
              : checklistFromStrings(action.checklist || []),
          recurrence:
            action.recurrence === undefined
              ? local.recurrence
              : normalizeRecurrence(action.recurrence),
          updated_at: new Date().toISOString(),
        })
      }
      if (task) {
        store.upsertTask(task)
        await scheduleTaskNotification(task, notificationsEnabled)
      }
    }

    if (action.type === 'complete_task') {
      const local = store.tasks.find((t) => t.id === action.task_id)
      if (local) {
        await completeOrRollTask(local, notificationsEnabled)
      } else if (useRemote) {
        const supabase = getSupabase()
        await supabase?.from('tasks').update({ completed: true }).eq('id', action.task_id)
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

      const mirrored = store.createTaskLocal({
        title: action.title,
        date: action.date,
        time: action.time,
        priority: 'high',
        userId,
      })
      await scheduleTaskNotification(mirrored, notificationsEnabled)
    }
  }
}

/** Complete a one-off task, or roll a monthly task to next month (reset checklist). */
export async function completeOrRollTask(task: Task, notificationsEnabled?: boolean) {
  const store = useNovaStore.getState()
  const notify = notificationsEnabled ?? store.settings.notificationsEnabled
  const useRemote = isSupabaseConfigured && !store.demoMode
  const recurrence = normalizeRecurrence(task.recurrence)

  if (recurrence?.type === 'monthly' && !task.completed) {
    const nextDate = advanceMonthlyDate(recurrence.dayOfMonth, task.date)
    const next: Task = normalizeTask({
      ...task,
      completed: false,
      date: nextDate,
      checklist: resetChecklist(task.checklist || []),
      updated_at: new Date().toISOString(),
    })
    if (useRemote) {
      const supabase = getSupabase()
      await supabase
        ?.from('tasks')
        .update({
          completed: false,
          date: next.date,
          checklist: next.checklist,
          recurrence: next.recurrence,
        })
        .eq('id', task.id)
    }
    store.upsertTask(next)
    await scheduleTaskNotification(next, notify)
    return { rolled: true as const, task: next }
  }

  const next: Task = {
    ...normalizeTask(task),
    completed: true,
    updated_at: new Date().toISOString(),
  }
  if (useRemote) {
    const supabase = getSupabase()
    await supabase?.from('tasks').update({ completed: true }).eq('id', task.id)
  }
  store.upsertTask(next)
  return { rolled: false as const, task: next }
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
    useNovaStore.getState().setTasks((data as Task[]).map(normalizeTask))
  }
}

export async function sendNovaMessage(message: string): Promise<AIChatResponse> {
  const store = useNovaStore.getState()
  const userId = store.sessionUserId
  if (!userId) throw new Error('Not signed in')

  store.addMessage({ role: 'user', content: message })

  const history = store.messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
  let accessToken: string | null = null
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    const { data } = await supabase!.auth.getSession()
    accessToken = data.session?.access_token ?? null
  }

  let response: AIChatResponse
  try {
    response = await chatWithNova({
      message,
      userId,
      userName: store.settings.name,
      tasks: store.tasks,
      history,
      accessToken,
    })
  } catch {
    response = clientLocalAI(message, store.tasks)
  }

  store.addMessage({ role: 'assistant', content: response.reply })
  await applyActions(response.actions || [], userId, store.settings.notificationsEnabled)
  return response
}

export async function toggleTaskCompleted(task: Task) {
  const store = useNovaStore.getState()
  if (!task.completed) {
    return completeOrRollTask(task)
  }
  const next = normalizeTask({
    ...task,
    completed: false,
    updated_at: new Date().toISOString(),
  })
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    await supabase?.from('tasks').update({ completed: false }).eq('id', task.id)
  }
  store.upsertTask(next)
  return { rolled: false as const, task: next }
}

export async function updateTaskFields(
  task: Task,
  patch: Partial<Pick<Task, 'title' | 'date' | 'time' | 'priority' | 'checklist' | 'recurrence'>>,
) {
  const store = useNovaStore.getState()
  const next = normalizeTask({
    ...task,
    ...patch,
    checklist: patch.checklist !== undefined ? normalizeChecklist(patch.checklist) : task.checklist,
    recurrence:
      patch.recurrence !== undefined ? normalizeRecurrence(patch.recurrence) : task.recurrence,
    updated_at: new Date().toISOString(),
  })
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    const remotePatch: Record<string, unknown> = { ...patch }
    if (patch.checklist !== undefined) remotePatch.checklist = next.checklist
    if (patch.recurrence !== undefined) remotePatch.recurrence = next.recurrence
    await supabase?.from('tasks').update(remotePatch).eq('id', task.id)
  }
  store.upsertTask(next)
  await scheduleTaskNotification(next, store.settings.notificationsEnabled)
  return next
}

export async function toggleChecklistItem(task: Task, itemId: string) {
  const checklist = normalizeChecklist(task.checklist).map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item,
  )
  return updateTaskFields(task, { checklist })
}

export async function addChecklistItem(task: Task, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return task
  const checklist = [
    ...normalizeChecklist(task.checklist),
    { id: uid('chk'), text: trimmed, done: false } as ChecklistItem,
  ]
  return updateTaskFields(task, { checklist })
}

export async function removeChecklistItem(task: Task, itemId: string) {
  const checklist = normalizeChecklist(task.checklist).filter((item) => item.id !== itemId)
  return updateTaskFields(task, { checklist })
}

export async function setMonthlyRecurrence(task: Task, dayOfMonth: number | null) {
  if (dayOfMonth == null) {
    return updateTaskFields(task, { recurrence: null })
  }
  const day = Math.min(31, Math.max(1, Math.floor(dayOfMonth)))
  const recurrence: TaskRecurrence = { type: 'monthly', dayOfMonth: day }
  const date = task.date || new Date().toISOString().slice(0, 10)
  return updateTaskFields(task, {
    recurrence,
    date: nextMonthlyDate(day, date),
  })
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
