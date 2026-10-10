/**
 * Wahrly Pro IAP — StoreKit / Play Billing via expo-iap.
 * Product must exist in App Store Connect / Play Console before purchase works.
 * Until the next native EAS build ships with expo-iap linked, purchase falls back
 * gracefully (web / Expo Go / missing store product).
 */

import { Platform } from 'react-native'
import { useNovaStore } from './store'

/** Monthly Pro subscription SKU (create in App Store Connect + Play Console). */
export const PRO_MONTHLY_SKU = 'com.wahrly.assistant.pro.monthly'

export type IapResult =
  | { ok: true; source: 'purchase' | 'restore' | 'active' }
  | { ok: false; reason: string }

let connecting: Promise<boolean> | null = null

async function loadIap() {
  if (Platform.OS === 'web') return null
  try {
    return await import('expo-iap')
  } catch {
    return null
  }
}

async function ensureConnected(): Promise<boolean> {
  const iap = await loadIap()
  if (!iap) return false
  if (!connecting) {
    connecting = iap
      .initConnection()
      .then(() => true)
      .catch(() => {
        connecting = null
        return false
      })
  }
  return connecting
}

export function setProUnlocked(unlocked: boolean) {
  useNovaStore.getState().updateSettings({ isPro: unlocked })
}

/** True when native store IAP module is available (not web / Expo Go stub). */
export async function isIapAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  return ensureConnected()
}

/**
 * Buy Pro monthly. Listens once for purchase success/error.
 * On web / unavailable store: returns a clear reason (UI can offer Settings).
 */
export async function purchasePro(): Promise<IapResult> {
  const iap = await loadIap()
  if (!iap) {
    return {
      ok: false,
      reason:
        Platform.OS === 'web'
          ? 'Purchases work in the iOS / Android app.'
          : 'In-app purchases need a store build (TestFlight / Play).',
    }
  }
  const ready = await ensureConnected()
  if (!ready) {
    return { ok: false, reason: 'Could not reach the App Store. Try again.' }
  }

  try {
    const products = await iap.fetchProducts({
      skus: [PRO_MONTHLY_SKU],
      type: 'subs',
    })
    if (!products?.length) {
      return {
        ok: false,
        reason: `Product ${PRO_MONTHLY_SKU} is not in the store yet. Add it in App Store Connect / Play Console.`,
      }
    }
  } catch {
    // Some stores throw on empty catalog — still attempt purchase sheet.
  }

  return new Promise<IapResult>((resolve) => {
    let settled = false
    const finish = (result: IapResult) => {
      if (settled) return
      settled = true
      try {
        unsubOk.remove()
      } catch {
        /* ignore */
      }
      try {
        unsubErr.remove()
      } catch {
        /* ignore */
      }
      resolve(result)
    }

    const unsubOk = iap.purchaseUpdatedListener(async (purchase) => {
      try {
        await iap.finishTransaction({ purchase, isConsumable: false })
      } catch {
        /* still unlock locally; server verify comes later */
      }
      setProUnlocked(true)
      finish({ ok: true, source: 'purchase' })
    })
    const unsubErr = iap.purchaseErrorListener((err) => {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message || 'Purchase cancelled')
          : 'Purchase cancelled'
      finish({ ok: false, reason: msg })
    })

    iap
      .requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: PRO_MONTHLY_SKU },
          google: {
            skus: [PRO_MONTHLY_SKU],
            subscriptionOffers: [],
          },
        },
      })
      .catch((e: unknown) => {
        finish({
          ok: false,
          reason: e instanceof Error ? e.message : 'Purchase failed',
        })
      })

    // Safety timeout — user may dismiss sheet without an error event.
    setTimeout(() => {
      if (!settled && useNovaStore.getState().settings.isPro) {
        finish({ ok: true, source: 'purchase' })
      } else if (!settled) {
        finish({ ok: false, reason: 'Purchase timed out or was cancelled.' })
      }
    }, 120_000)
  })
}

/** Restore previous Pro subscription / non-consumable. */
export async function restorePro(): Promise<IapResult> {
  const iap = await loadIap()
  if (!iap) {
    return {
      ok: false,
      reason:
        Platform.OS === 'web'
          ? 'Restore works in the iOS / Android app.'
          : 'Restore needs a store build.',
    }
  }
  const ready = await ensureConnected()
  if (!ready) return { ok: false, reason: 'Could not reach the App Store.' }

  try {
    const active = await iap.getActiveSubscriptions([PRO_MONTHLY_SKU])
    if (active?.length) {
      setProUnlocked(true)
      return { ok: true, source: 'active' }
    }
  } catch {
    /* fall through to available purchases */
  }

  try {
    const purchases = await iap.getAvailablePurchases()
    const hit = (purchases || []).find(
      (p) =>
        p.productId === PRO_MONTHLY_SKU ||
        (p as { productIds?: string[] }).productIds?.includes(PRO_MONTHLY_SKU),
    )
    if (hit) {
      try {
        await iap.finishTransaction({ purchase: hit, isConsumable: false })
      } catch {
        /* ignore */
      }
      setProUnlocked(true)
      return { ok: true, source: 'restore' }
    }
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : 'Restore failed',
    }
  }

  return { ok: false, reason: 'No Pro purchase found for this Apple / Google account.' }
}

/** Sync entitlement on app launch (best-effort). */
export async function syncProEntitlement(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const result = await restorePro()
    if (!result.ok && useNovaStore.getState().settings.isPro) {
      // Keep local unlock if restore failed transiently (offline).
      return
    }
  } catch {
    /* ignore */
  }
}
