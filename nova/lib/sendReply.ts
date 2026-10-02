/** Copy draft replies for inbox asks / sent promises — clipboard only (no Gmail send). */

import { copyText } from './clipboard'
import { notifyUser } from './notify'

export async function copyDraftOnly(text: string) {
  await copyText(text)
  notifyUser('Copied', 'Paste into Gmail when you reply.')
}

/** Demo / disconnected: same copy path with a clearer message. */
export async function copyDraftAsDemo(text: string) {
  await copyText(text)
  notifyUser('Draft copied', 'Paste into Gmail yourself to reply.')
}
