/** Copy text for draft replies — clipboard only (no iOS Share sheet). */

import { Platform } from 'react-native'
import * as Clipboard from 'expo-clipboard'

export async function copyText(text: string): Promise<'copied'> {
  const value = text.trim()
  if (!value) throw new Error('Nothing to copy')

  await Clipboard.setStringAsync(value)

  // Web fallback if expo-clipboard is a no-op in some browsers
  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      }
    } catch {
      // already wrote via expo-clipboard
    }
  }

  return 'copied'
}
