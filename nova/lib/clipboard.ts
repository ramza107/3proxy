/** Copy text for draft replies — clipboard only (no iOS Share sheet). */

import { Platform } from 'react-native'
import * as Clipboard from 'expo-clipboard'

function webFallbackCopy(value: string): boolean {
  if (typeof document === 'undefined') return false
  try {
    const el = document.createElement('textarea')
    el.value = value
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export async function copyText(text: string): Promise<'copied'> {
  const value = text.trim()
  if (!value) throw new Error('Nothing to copy')

  let wrote = false
  try {
    await Clipboard.setStringAsync(value)
    wrote = true
  } catch {
    // try web paths below
  }

  if (Platform.OS === 'web') {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        wrote = true
      }
    } catch {
      // fallback
    }
    if (!wrote) {
      wrote = webFallbackCopy(value)
    }
  }

  if (!wrote) {
    throw new Error('Could not copy — try again or select the text manually')
  }

  return 'copied'
}
