import { useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { PRO_MONTHLY_SKU, purchasePro, restorePro, setProUnlocked } from '../lib/iap'
import { useIsPro } from '../lib/pro'
import { useT } from '../lib/useT'

type Props = {
  /** Compact embed (Invest lock) vs Settings card block */
  compact?: boolean
  onUnlocked?: () => void
}

/**
 * Real Pro upgrade UI — StoreKit / Play via expo-iap.
 * Demo unlock only in __DEV__ so TestFlight / production stay honest.
 */
export function ProPaywall({ compact, onUnlocked }: Props) {
  const t = useT()
  const isPro = useIsPro()
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null)

  const afterOk = () => {
    onUnlocked?.()
    Alert.alert(t('pro.title'), t('pro.unlockedBody'))
  }

  const onBuy = async () => {
    setBusy('buy')
    try {
      const res = await purchasePro()
      if (res.ok) afterOk()
      else Alert.alert(t('pro.title'), res.reason)
    } finally {
      setBusy(null)
    }
  }

  const onRestore = async () => {
    setBusy('restore')
    try {
      const res = await restorePro()
      if (res.ok) afterOk()
      else Alert.alert(t('pro.restore'), res.reason)
    } finally {
      setBusy(null)
    }
  }

  if (isPro) {
    return (
      <View style={[styles.wrap, compact && styles.compact]}>
        <Text style={styles.active}>{t('pro.active')}</Text>
        <Text style={styles.hint}>{t('pro.activeHint')}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      {!compact ? (
        <>
          <Text style={styles.price}>{t('pro.price')}</Text>
          <Text style={styles.hint}>{t('pro.priceHint')}</Text>
        </>
      ) : (
        <Text style={styles.hint}>{t('pro.upgradeBody')}</Text>
      )}

      <Pressable
        style={[styles.buy, busy && styles.disabled]}
        onPress={onBuy}
        disabled={!!busy}
        accessibilityRole="button"
      >
        {busy === 'buy' ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.buyText}>{t('pro.subscribe')}</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.restore, busy && styles.disabled]}
        onPress={onRestore}
        disabled={!!busy}
        hitSlop={8}
      >
        {busy === 'restore' ? (
          <ActivityIndicator color={colors.accentStrong} />
        ) : (
          <Text style={styles.restoreText}>{t('pro.restore')}</Text>
        )}
      </Pressable>

      {__DEV__ || Platform.OS === 'web' ? (
        <Pressable
          onPress={() => {
            setProUnlocked(true)
            onUnlocked?.()
          }}
          hitSlop={8}
          style={styles.dev}
        >
          <Text style={styles.devText}>{t('pro.devUnlock')}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sku}>{PRO_MONTHLY_SKU}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  compact: { marginTop: 4 },
  price: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 18 },
  hint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  active: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 15 },
  buy: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 16 },
  restore: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  restoreText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 14 },
  disabled: { opacity: 0.55 },
  dev: { alignSelf: 'center', paddingVertical: 4 },
  devText: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12 },
  sku: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 10,
    textAlign: 'center',
  },
})
