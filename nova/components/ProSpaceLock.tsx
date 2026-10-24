import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
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
  const router = useRouter()

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker={kicker} title={title} sub={sub} />
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('pro.badge')}</Text>
          </View>
          <Text style={styles.lockTitle}>{lockTitle}</Text>
          <Text style={styles.lockText}>{lockText}</Text>
          <ProPaywall compact />
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <Text style={styles.link}>{t('pro.upgrade')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: 4,
    backgroundColor: 'rgba(250,252,251,0.94)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 10,
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
    fontSize: 24,
    letterSpacing: -0.4,
  },
  lockText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 4,
  },
})
