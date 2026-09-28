/**
 * Precision tests for inbox ask detection.
 * Run: npx tsx src/email/meetings.test.ts
 */
import {
  actionableText,
  extractMeetingsLocal,
  isNoiseSender,
  type MeetingAlert,
} from './meetings.js'
import type { InboxMessagePreview } from './gmail.js'

function msg(partial: Partial<InboxMessagePreview> & { id: string }): InboxMessagePreview {
  return {
    from: partial.from || 'alex@work.example',
    fromName: partial.fromName || 'Alex',
    subject: partial.subject || '',
    snippet: partial.snippet || '',
    bodyText: partial.bodyText || '',
    date: partial.date || '2026-09-27T12:00:00.000Z',
    unread: true,
    ...partial,
  }
}

let failed = 0
function assert(cond: boolean, label: string) {
  if (!cond) {
    failed += 1
    console.error('FAIL', label)
  } else {
    console.log('ok  ', label)
  }
}

const today = '2026-09-28'

// --- should MATCH ---
const positives: InboxMessagePreview[] = [
  msg({
    id: 'p1',
    subject: 'Quick sync?',
    snippet: 'Can we meet tomorrow at 3pm?',
    bodyText: 'Hey — can we meet tomorrow at 3pm to go over the plan?',
  }),
  msg({
    id: 'p2',
    subject: 'Q3 numbers',
    snippet: 'Please send me the report by tomorrow morning.',
    bodyText: 'Hi, please send me the report by tomorrow 10:00. Thanks.',
  }),
  msg({
    id: 'p3',
    from: 'masha@mail.ru',
    fromName: 'Маша',
    subject: 'Созвон',
    snippet: 'Давай созвонимся сегодня вечером',
    bodyText: 'Привет! Давай созвонимся сегодня вечером, удобно?',
  }),
  msg({
    id: 'p4',
    subject: 'Call',
    snippet: 'Can you call me back today?',
    bodyText: 'When you get a chance, can you call me back today?',
  }),
  msg({
    id: 'p5',
    subject: 'Catch up',
    snippet: "Let's catch up this week over coffee",
    bodyText: "Hey! Let's catch up this week over coffee if you're free.",
  }),
]

// --- should NOT MATCH ---
const negatives: InboxMessagePreview[] = [
  msg({
    id: 'n1',
    from: 'noreply@github.com',
    fromName: 'GitHub',
    subject: '[repo] New issue opened',
    snippet: 'A new issue was opened',
    bodyText: 'View on GitHub. Call us if you need help.',
  }),
  msg({
    id: 'n2',
    subject: 'Your receipt from Stripe',
    snippet: 'Payment due — receipt attached',
    bodyText: 'Thanks for your payment. Due date on invoice. Phone: 1-800-555.',
  }),
  msg({
    id: 'n3',
    subject: 'Teams: new channel message',
    snippet: 'Someone posted in Teams',
    bodyText: 'Open Microsoft Teams to see the message. See you there!',
  }),
  msg({
    id: 'n4',
    subject: 'Weekly product digest',
    from: 'digest@newsletter.com',
    fromName: 'Product Digest',
    snippet: 'Top stories this week',
    bodyText: 'Meeting of the minds: industry roundup. Unsubscribe below.',
  }),
  msg({
    id: 'n5',
    subject: 'Re: Project update',
    snippet: 'Thanks, see you then!',
    bodyText:
      'Thanks, see you then!\n\nOn Mon Alex wrote:\n> Can we meet tomorrow?\n> Please send the report.',
  }),
  msg({
    id: 'n6',
    subject: 'Shipping update',
    snippet: 'Your package is out for delivery',
    bodyText: 'Track your package. Call the courier if needed. Deadline for pickup is tomorrow.',
  }),
  msg({
    id: 'n7',
    subject: 'Invitation: Design sync @ Mon',
    from: 'calendar-notification@google.com',
    fromName: 'Google Calendar',
    snippet: 'You have been invited',
    bodyText: 'Join Zoom meeting. When: Monday.',
  }),
  msg({
    id: 'n8',
    subject: 'Password reset',
    snippet: 'Reset your password',
    bodyText: 'Click to reset. If you did not ask, call support.',
  }),
  msg({
    id: 'n9',
    subject: 'Hello',
    snippet: 'Hope you had a nice lunch',
    bodyText: 'Hope you had a nice lunch and a good call with the client yesterday.',
  }),
  msg({
    id: 'n10',
    subject: 'FYI deck',
    snippet: 'Sharing the deck for reference',
    bodyText: 'Sharing the deck for reference — no action needed. Deadline was last week.',
  }),
]

const posHits = extractMeetingsLocal(positives, today)
assert(posHits.length === positives.length, `positives all match (got ${posHits.length})`)
assert(
  posHits.every((h: MeetingAlert) => ['meet', 'report', 'call'].includes(h.intent)),
  'positive intents are meet/report/call',
)

const negHits = extractMeetingsLocal(negatives, today)
assert(negHits.length === 0, `negatives none match (got ${negHits.map((h) => h.messageId).join(',')})`)

assert(isNoiseSender('noreply@github.com', 'GitHub', 'issue'), 'noise github')
assert(isNoiseSender('alerts@stripe.com', 'Stripe', 'receipt'), 'noise stripe')
assert(!isNoiseSender('alex@work.com', 'Alex', 'Quick sync?'), 'human not noise')

const stripped = actionableText(
  msg({
    id: 'q',
    subject: 'Thanks',
    snippet: 'Thanks!',
    bodyText: 'Thanks!\n\nOn Mon wrote:\n> Can we meet tomorrow?\n> Please send the report.',
  }),
)
assert(!/Can we meet/.test(stripped), 'quoted ask stripped from actionable text')

if (failed) {
  console.error(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nall passed')
