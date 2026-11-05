import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { useT } from '../lib/useT'
import { MistPanel } from './MistPanel'
import { MistScreenHero } from './MistScreenHero'
import { ProPaywall } from './ProPaywall'
import { Screen } from './Screen'

type Props = {
  kicker: string
  title: string
  sub: string
  lockTitle: string
  lockText: string
}

/** Full-screen Free → Pro gate for a space — mist hero + frosted panel. */
export function ProSpaceLock({ kicker: _kicker, title, sub, lockTitle, lockText }: Props) {
  const t = useT()

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <MistScreenHero title={title} sub={sub} chip={t('pro.badge')} />
        <View style={styles.body}>
          <MistPanel emphasize>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('pro.badge')}</Text>
            </View>
            <Text style={styles.lockTitle}>{lockTitle}</Text>
            <Text style={styles.lockText}>{lockText}</Text>
            <ProPaywall compact />
          </MistPanel>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 72,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
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
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  lockText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
})
