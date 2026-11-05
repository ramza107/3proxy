import { z } from 'zod'

const prioritySchema = z.enum(['low', 'medium', 'high'])
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()
const timeSchema = z
  .string()
  .regex(/^\d{1,2}:\d{2}$/)
  .nullable()
  .optional()

const recurrenceSchema = z
  .object({
    freq: z.enum(['daily', 'weekly']),
    days: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .nullable()
  .optional()

const createTaskSchema = z.object({
  type: z.literal('create_task'),
  title: z.string().min(1).max(200),
  date: dateSchema,
  time: timeSchema,
  priority: prioritySchema.optional().default('medium'),
  recurrence: recurrenceSchema,
})

const updateTaskSchema = z.object({
  type: z.literal('update_task'),
  task_id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  date: dateSchema,
  time: timeSchema,
  priority: prioritySchema.optional(),
})

const completeTaskSchema = z.object({
  type: z.literal('complete_task'),
  task_id: z.string().min(1),
})

const deleteTaskSchema = z.object({
  type: z.literal('delete_task'),
  task_id: z.string().min(1),
})

const createReminderSchema = z.object({
  type: z.literal('create_reminder'),
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{1,2}:\d{2}$/),
  task_id: z.string().optional(),
})

const createBillSchema = z.object({
  type: z.literal('create_bill'),
  title: z.string().min(1).max(80),
  amount: z.coerce.number().min(0),
  currency: z.string().optional().default('UAH'),
  dayOfMonth: z.coerce.number().int().min(1).max(28),
  category: z.string().optional().default('General'),
  payHowTo: z.string().nullable().optional(),
})

const markBillPaidSchema = z.object({
  type: z.literal('mark_bill_paid'),
  bill_id: z.string().nullable().optional(),
  title_hint: z.string().nullable().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable()
    .optional(),
})

const createCalendarEventSchema = z.object({
  type: z.literal('create_calendar_event'),
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{1,2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(5).max(480).optional().default(60),
  location: z.string().nullable().optional(),
})

export const aiActionSchema = z.discriminatedUnion('type', [
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  deleteTaskSchema,
  createReminderSchema,
  createBillSchema,
  markBillPaidSchema,
  createCalendarEventSchema,
])

export type SanitizedAIAction = z.infer<typeof aiActionSchema>

function normalizeTime(t: string | null | undefined): string | null {
  if (!t) return null
  const m = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Drop malformed actions; normalize times; keep only known task/bill ids when required. */
export function sanitizeAIActions(
  raw: unknown,
  knownTaskIds: Set<string>,
  knownBillIds: Set<string>,
): { actions: SanitizedAIAction[]; dropped: number } {
  if (!Array.isArray(raw)) return { actions: [], dropped: 0 }
  const actions: SanitizedAIAction[] = []
  let dropped = 0

  for (const item of raw.slice(0, 12)) {
    const parsed = aiActionSchema.safeParse(item)
    if (!parsed.success) {
      dropped += 1
      continue
    }
    let action = parsed.data

    if ('time' in action && action.time != null) {
      const t = normalizeTime(action.time)
      if (!t) {
        dropped += 1
        continue
      }
      action = { ...action, time: t } as SanitizedAIAction
    }

    if (
      (action.type === 'update_task' ||
        action.type === 'complete_task' ||
        action.type === 'delete_task') &&
      !knownTaskIds.has(action.task_id)
    ) {
      dropped += 1
      continue
    }

    if (action.type === 'mark_bill_paid') {
      if (action.bill_id && !knownBillIds.has(action.bill_id)) {
        action = { ...action, bill_id: null }
      }
      if (!action.bill_id && !(action.title_hint || '').trim()) {
        dropped += 1
        continue
      }
    }

    if (action.type === 'create_task' && action.recurrence?.freq === 'weekly') {
      const days = (action.recurrence.days || []).filter((d) => d >= 0 && d <= 6)
      action = {
        ...action,
        recurrence: { freq: 'weekly', days: days.length ? days : [1] },
      }
    }

    actions.push(action)
  }

  return { actions, dropped }
}
