/** Gmail send/draft helpers — kept for a later release; UI currently read-only. */

import { Alert } from 'react-native'
import { createEmailDraft, sendEmailReply } from './emailApi'
import { copyText } from './clipboard'

export async function copyDraftOnly(text: string) {
  await copyText(text)
  Alert.alert('Draft copied', 'Paste into Gmail when you reply.')
}

export async function sendOrDraftReply(params: {
  userId: string
  to: string
  subject: string
  body: string
  threadId?: string | null
}): Promise<'sent' | 'draft' | 'copied'> {
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
    Alert.alert('Sent', `Reply emailed to ${params.to}.`)
    return 'sent'
  } catch (sendErr) {
    try {
      await createEmailDraft(params.userId, {
        to: params.to,
        subject,
        body: params.body,
        threadId: params.threadId,
      })
      Alert.alert('Draft in Gmail', 'Could not send — opened a draft in Gmail.')
      return 'draft'
    } catch {
      await copyDraftOnly(params.body)
      Alert.alert(
        'Copy instead',
        sendErr instanceof Error ? sendErr.message : 'Could not send from Wahrly.',
      )
      return 'copied'
    }
  }
}

export function confirmSendReply(params: {
  to: string
  onConfirm: () => void
}) {
  Alert.alert('Send with Gmail?', `Email ${params.to} from your connected account?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Send', style: 'default', onPress: params.onConfirm },
  ])
}
