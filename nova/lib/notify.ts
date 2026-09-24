/** Cross-platform alerts — RN Alert is unreliable on web (esp. multi-button). */

import { Alert, Platform } from 'react-native'

export function notifyUser(title: string, message?: string) {
  const body = message?.trim() || ''
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(body ? `${title}\n\n${body}` : title)
    return
  }
  Alert.alert(title, body || undefined)
}

export function confirmUser(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`))
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', style: 'default', onPress: () => resolve(true) },
    ])
  })
}

export function confirmChoices(
  title: string,
  message: string,
  choices: { label: string; style?: 'cancel' | 'default' | 'destructive' }[],
): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Web: OK = first non-cancel, Cancel = cancel
    const cancel = choices.find((c) => c.style === 'cancel')
    const primary = choices.find((c) => c.style !== 'cancel') || choices[0]
    const ok = window.confirm(`${title}\n\n${message}`)
    if (!ok) return Promise.resolve(cancel?.label || null)
    return Promise.resolve(primary?.label || null)
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      choices.map((c) => ({
        text: c.label,
        style: c.style || 'default',
        onPress: () => resolve(c.label),
      })),
      { cancelable: true, onDismiss: () => resolve(null) },
    )
  })
}
