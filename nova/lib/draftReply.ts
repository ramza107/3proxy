/** Local draft replies for inbox asks / sent promises (copy only — no send). */

import type { EmailPromise, MeetingAlert } from '../types'

export function draftForMeeting(m: MeetingAlert): string {
  if (m.suggestedReply?.trim()) return m.suggestedReply.trim()
  const who = m.fromName.split(/\s+/)[0] || 'there'
  const when = [m.suggestedDate, m.suggestedTime].filter(Boolean).join(' ')
  if (m.intent === 'meet') {
    return when
      ? `Hi ${who},\n\nThanks — ${when} works for me. Looking forward to it.\n\nBest`
      : `Hi ${who},\n\nThanks for reaching out — happy to meet. What times work for you this week?\n\nBest`
  }
  if (m.intent === 'report') {
    return `Hi ${who},\n\nGot it — I'll send the report${when ? ` by ${when}` : ' soon'}.\n\nBest`
  }
  if (m.intent === 'call') {
    return when
      ? `Hi ${who},\n\nSounds good — I'll call you ${when}.\n\nBest`
      : `Hi ${who},\n\nHappy to talk — when works for you?\n\nBest`
  }
  return `Hi ${who},\n\nThanks for the note — I'll follow up shortly.\n\nBest`
}

export function draftForPromise(p: EmailPromise): string {
  if (p.suggestedReply?.trim()) return p.suggestedReply.trim()
  const who = p.toName.split(/\s+/)[0] || 'there'
  const when = p.suggestedDate ? ` by ${p.suggestedDate}` : ''
  return `Hi ${who},\n\nJust a quick note — I'm on track for: ${p.suggestedTask}${when}.\n\nBest`
}
