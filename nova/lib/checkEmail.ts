import {
  fetchEmailDigest,
  fetchEmailMeetings,
  fetchEmailPromises,
  fetchEmailStatus,
} from './emailApi'
import type { AIChatResponse } from '../types'

/** RU/EN: user wants Wahrly to actually look at Gmail, not create a “check email” task. */
export function isCheckEmailIntent(text: string): boolean {
  const t = text.toLowerCase().trim()
  if (!t) return false
  if (
    /(проверь|проверьте|проверить|посмотри|посмотрите|покажи|покажите|открой|читай|прочитай).{0,40}(почт|inbox|gmail|письм|емейл|имейл)/i.test(
      t,
    )
  ) {
    return true
  }
  if (
    /(почт|inbox|gmail|письм).{0,40}(проверь|проверить|посмотри|покажи|что\s+нового|кто\s+писал)/i.test(
      t,
    )
  ) {
    return true
  }
  if (/\b(check|read|scan|look at|review|open)\b.{0,40}\b(e-?mail|inbox|mail|gmail)\b/i.test(t)) {
    return true
  }
  if (/\b(e-?mail|inbox|mail|gmail)\b.{0,40}\b(check|read|scan|look|new|who)\b/i.test(t)) {
    return true
  }
  if (
    /^(что\s+по\s+почте|кто\s+писал|есть\s+ли\s+письма|any\s+(new\s+)?(mail|email|messages)\??)$/i.test(
      t,
    )
  ) {
    return true
  }
  return false
}

function prefersRussian(text: string) {
  return /[а-яё]/i.test(text)
}

/**
 * Pull digest + meeting asks + sent promises and answer in chat.
 */
export async function replyFromEmailCheck(
  userId: string,
  userMessage: string,
): Promise<AIChatResponse> {
  const ru = prefersRussian(userMessage)
  try {
    const status = await fetchEmailStatus(userId)
    if (!status.connected) {
      return {
        reply: ru
          ? 'Gmail ещё не подключён. Зайди в Settings → Connect with Google (Allow) — после этого я смогу проверить почту прямо здесь.'
          : 'Gmail isn’t connected yet. Open Settings → Connect with Google, tap Allow — then I can check your inbox here.',
        actions: [],
      }
    }

    const [digest, meetings, promises] = await Promise.all([
      fetchEmailDigest(userId).catch(() => null),
      fetchEmailMeetings(userId, { hours: 48 }).catch(() => null),
      fetchEmailPromises(userId, { days: 7 }).catch(() => null),
    ])

    const parts: string[] = []
    if (ru) {
      parts.push(`Проверил почту (${status.email || 'Gmail'}).`)
    } else {
      parts.push(`Checked your mail (${status.email || 'Gmail'}).`)
    }

    if (digest?.summary) {
      parts.push(digest.summary)
      const highlights = (digest.highlights || []).slice(0, 4)
      if (highlights.length) {
        parts.push(
          highlights
            .map((h) => `· ${h.fromName}: ${h.subject}${h.time ? ` (${h.time})` : ''}`)
            .join('\n'),
        )
      }
    }

    if (meetings?.meetings?.length) {
      parts.push(
        ru
          ? `Важные просьбы во входящих:\n${meetings.meetings
              .slice(0, 4)
              .map((m) => `· ${m.summary}`)
              .join('\n')}`
          : `Important asks in inbox:\n${meetings.meetings
              .slice(0, 4)
              .map((m) => `· ${m.summary}`)
              .join('\n')}`,
      )
    } else if (meetings?.summary) {
      parts.push(meetings.summary)
    }

    if (promises?.promises?.length) {
      parts.push(
        ru
          ? `Твои обещания в Sent:\n${promises.promises
              .slice(0, 3)
              .map((p) => `· ${p.suggestedTask}`)
              .join('\n')}`
          : `Promises you made in Sent:\n${promises.promises
              .slice(0, 3)
              .map((p) => `· ${p.suggestedTask}`)
              .join('\n')}`,
      )
    }

    if (parts.length <= 1) {
      parts.push(
        ru
          ? 'Пока тихо — или сервер почты ещё обновляется. Карточки Inbox есть и на вкладке Home.'
          : 'Inbox looks quiet — or the mail API is still deploying. You can also open Home for the inbox cards.',
      )
    } else {
      parts.push(
        ru
          ? 'Подробности — на Home (Yesterday’s inbox / Inbox asks / Promises).'
          : 'More detail is on Home (Yesterday’s inbox / Inbox asks / Promises).',
      )
    }

    return { reply: parts.join('\n\n'), actions: [] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'email check failed'
    return {
      reply: ru
        ? `Не удалось прочитать почту сейчас (${msg}). Открой Home или Settings → Gmail.`
        : `Couldn’t read mail right now (${msg}). Try Home or Settings → Gmail.`,
      actions: [],
    }
  }
}
