import Constants from 'expo-constants'
import type { AIChatResponse, Bill, Task } from '../types'

const extra = Constants.expoConfig?.extra ?? {}

export const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || (extra.apiUrl as string) || 'http://localhost:8787'

export async function chatWithNova(params: {
  message: string
  userId: string
  userName?: string | null
  tasks: Task[]
  bills?: Bill[]
  history: { role: 'user' | 'assistant'; content: string }[]
  accessToken?: string | null
}): Promise<AIChatResponse> {
  const res = await fetch(`${apiUrl}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {}),
    },
    body: JSON.stringify({
      message: params.message,
      user_id: params.userId,
      user_name: params.userName,
      tasks: params.tasks,
      bills: (params.bills || []).map((b) => ({
        id: b.id,
        title: b.title,
        amount: b.amount,
        currency: b.currency,
        dayOfMonth: b.dayOfMonth,
        category: b.category,
        lastPaidMonth: b.lastPaidMonth,
        active: b.active,
      })),
      history: params.history.slice(-8),
      current_date: new Date().toISOString().slice(0, 10),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `AI request failed (${res.status})`)
  }

  return res.json()
}
