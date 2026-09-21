import { Alert } from 'react-native'
import { createEmailDraft, sendEmailReply } from './emailApi'
import { copyText } from './clipboard'

export async function copyOrShareDraft(text: string) {
  const mode = await copyText(text)
  Alert.alert(
    mode === 'copied' ? 'Draft copied' : 'Draft ready',
    mode === 'copied'
      ? 'Paste into Gmail when you reply — or use Send in Wahrly after reconnecting Google.'
      : 'Share sheet opened — send or copy from there.',
  )
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
      Alert.alert(
        'Draft in Gmail',
        'Could not send directly — opened a draft in Gmail. Reconnect Google in Settings if send keeps failing.',
      )
      return 'draft'
    } catch {
      await copyOrShareDraft(params.body)
      Alert.alert(
        'Copy instead',
        sendErr instanceof Error
          ? `${sendErr.message}\n\nDraft copied — reconnect Google with send permission in Settings.`
          : 'Draft copied — reconnect Google in Settings to send from Wahrly.',
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
