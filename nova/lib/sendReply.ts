/** Gmail send — API only. Never opens the iOS Share sheet. */

import { Alert } from 'react-native'
import { sendEmailReply } from './emailApi'
import { copyText } from './clipboard'

export async function copyDraftOnly(text: string) {
  await copyText(text)
  Alert.alert('Copied', 'Paste into Gmail when you reply.')
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
    Alert.alert('Sent', `Reply emailed to ${params.to}.`)
    return 'sent'
  } catch (sendErr) {
    const message =
      sendErr instanceof Error ? sendErr.message : 'Could not send from Wahrly.'
    return await new Promise((resolve) => {
      Alert.alert('Couldn’t send', `${message}\n\nCopy the reply text instead?`, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancelled') },
        {
          text: 'Copy',
          onPress: () => {
            void copyDraftOnly(params.body)
              .then(() => resolve('copied'))
              .catch(() => resolve('cancelled'))
          },
        },
      ])
    })
  }
}

export function confirmSendReply(params: {
  to: string
  onConfirm: () => void
}) {
  Alert.alert('Send with Gmail?', `Email ${params.to} from your connected Google account?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Send', style: 'default', onPress: params.onConfirm },
  ])
}
