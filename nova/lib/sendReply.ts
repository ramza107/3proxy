/** Gmail send — API only. Never opens the iOS Share sheet. */

import { sendEmailReply } from './emailApi'
import { copyText } from './clipboard'
import { confirmChoices, confirmUser, notifyUser } from './notify'

export async function copyDraftOnly(text: string) {
  await copyText(text)
  notifyUser('Copied', 'Paste into Gmail when you reply.')
}

/** Demo / disconnected: copy draft instead of calling Gmail. */
export async function copyDraftAsDemo(text: string) {
  await copyText(text)
  notifyUser(
    'Draft copied',
    'Demo mode — paste into Gmail yourself. Connect Google in Settings to send from Wahrly.',
  )
}

/** Send via Gmail API. On failure offer clipboard copy (no Share sheet). */
export async function sendGmailOnly(params: {
  userId: string
  to: string
  subject: string
  body: string
  threadId?: string | null
}): Promise<'sent' | 'copied' | 'cancelled'> {
  const subject = params.subject.toLowerCase().startsWith('re:')
    ? params.subject
    : `Re: ${params.subject}`

  try {
    await sendEmailReply(params.userId, {
      to: params.to,
      subject,
      body: params.body,
      threadId: params.threadId,
    })
    notifyUser('Sent', `Reply emailed to ${params.to}.`)
    return 'sent'
  } catch (sendErr) {
    const message =
      sendErr instanceof Error ? sendErr.message : 'Could not send from Wahrly.'
    const choice = await confirmChoices('Couldn’t send', `${message}\n\nCopy the reply text instead?`, [
      { label: 'Cancel', style: 'cancel' },
      { label: 'Copy', style: 'default' },
    ])
    if (choice !== 'Copy') return 'cancelled'
    try {
      await copyDraftOnly(params.body)
      return 'copied'
    } catch {
      return 'cancelled'
    }
  }
}

export async function confirmSendReply(params: {
  to: string
}): Promise<boolean> {
  return confirmUser('Send with Gmail?', `Email ${params.to} from your connected Google account?`)
}
