import { chatWithNova } from '../lib/api'
import { isCheckEmailIntent, replyFromEmailCheck } from '../lib/checkEmail'
import { scheduleTaskNotification, cancelNotification } from '../lib/notifications'
import { isOrganizeDayIntent, planDayActions } from '../lib/scheduleDay'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { todayISO, uid, useNovaStore } from '../lib/store'
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
  }
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

export async function organizeMyDay(opts?: { includeUndated?: boolean }): Promise<AIChatResponse> {
  const store = useNovaStore.getState()
  const userId = store.sessionUserId
  if (!userId) throw new Error('Not signed in')

  const planned = planDayActions({
    tasks: store.tasks,
    day: todayISO(),
    settings: store.settings,
    includeUndated: opts?.includeUndated !== false,
  })

  if (planned.actions.length) {
    await applyActions(planned.actions, userId, store.settings.notificationsEnabled)
  }

  return { reply: planned.summary, actions: planned.actions }
}

export async function sendNovaMessage(message: string): Promise<AIChatResponse> {
  const store = useNovaStore.getState()
  const userId = store.sessionUserId
  if (!userId) throw new Error('Not signed in')

  store.addMessage({ role: 'user', content: message })

  let response: AIChatResponse

  // Real Gmail check — don't fall through to the Tasks canned reply
  if (isCheckEmailIntent(message)) {
    response = await replyFromEmailCheck(userId, message)
    store.addMessage({ role: 'assistant', content: response.reply })
    return response
  }

  // Smart day packer — Motion-style slot filling for today's tasks
  if (isOrganizeDayIntent(message)) {
    response = await organizeMyDay()
    store.addMessage({ role: 'assistant', content: response.reply })
    return response
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
  const next = {
    ...task,
    completed: !task.completed,
    updated_at: new Date().toISOString(),
  }
  if (isSupabaseConfigured && !store.demoMode) {
    const supabase = getSupabase()
    await supabase?.from('tasks').update({ completed: next.completed }).eq('id', task.id)
  }
  store.upsertTask(next)
}

export async function updateTaskFields(
  task: Task,
  patch: Partial<Pick<Task, 'title' | 'date' | 'time' | 'priority'>>,
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
