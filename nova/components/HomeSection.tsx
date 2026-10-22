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
 * Home block on the mist field.
 * Emphasized sections keep a soft surface; secondary ones stay open (less dashboard).
 */
export function HomeSection({ title, meta, action, children, emphasize }: Props) {
  return (
    <View style={[styles.block, emphasize && styles.blockEmph]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={emphasize ? styles.titleLg : styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      {emphasize ? <View style={styles.divider} /> : null}
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: 'transparent',
    borderRadius: radii.lg,
    paddingHorizontal: 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  blockEmph: {
    backgroundColor: colors.bgCardSolid,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#0F2A32',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
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
    fontFamily: fonts.brand,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  title: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
