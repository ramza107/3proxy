import type { ReactNode } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  title: string
  meta?: string
  action?: ReactNode
  children: ReactNode
  /** Slightly larger title for primary blocks (Today, Ask) */
  emphasize?: boolean
}

/**
 * Home content card — Spectrum-style block on the mist field.
 * Soft mint-white surface, rounded corners, quiet shadow. Teal accents unchanged.
 */
export function HomeSection({ title, meta, action, children, emphasize }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={emphasize ? styles.titleLg : styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      <View style={styles.divider} />
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#0F2A32',
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
      default: {
        shadowColor: '#0F2A32',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headText: { flex: 1, gap: 3 },
  titleLg: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  meta: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  action: { paddingTop: 1 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: -spacing.md,
  },
  body: { gap: 8 },
})
