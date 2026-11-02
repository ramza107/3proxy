import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { useT } from '../lib/useT'
import { ProPaywall } from './ProPaywall'
import { Screen } from './Screen'
import { ScreenHeader } from './ScreenHeader'

type Props = {
  kicker: string
  title: string
  sub: string
  lockTitle: string
  lockText: string
}

/** Full-screen Free → Pro gate for a space. */
export function ProSpaceLock({ kicker, title, sub, lockTitle, lockText }: Props) {
  const t = useT()

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker={kicker} title={title} sub={sub} />
        <View style={styles.body}>
          <View style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('pro.badge')}</Text>
            </View>
            <Text style={styles.lockTitle}>{lockTitle}</Text>
            <Text style={styles.lockText}>{lockText}</Text>
            <ProPaywall compact />
          </View>
        </View>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 72,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(250,252,251,0.96)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 12,
    shadowColor: '#0F2A32',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.bgDeep,
  },
  badgeText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lockTitle: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  lockText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
})
