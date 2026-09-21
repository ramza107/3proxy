/** Copy text for draft replies — web clipboard, else Share sheet. */

import { Platform, Share } from 'react-native'

export async function copyText(text: string): Promise<'copied' | 'shared'> {
  const value = text.trim()
  if (!value) throw new Error('Nothing to copy')

  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return 'copied'
      }
    } catch {
      // fall through
    }
  }

  await Share.share({ message: value })
  return 'shared'
}
