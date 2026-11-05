import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  kicker?: string
  title: string
  sub?: string
  /** Extra row under the sub (stats, pills, etc.) */
  children?: ReactNode
  trailing?: ReactNode
}

/**
 * Solid header panel so titles never wash into the painterly backdrop.
 */
export function ScreenHeader({ kicker, title, sub, children, trailing }: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.top}>
        <View style={styles.textCol}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: 10,
    marginHorizontal: spacing.lg,
    marginBottom: 8,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  textCol: { flex: 1, gap: 4 },
  trailing: { paddingTop: 4 },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  sub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  body: { gap: 8 },
})
