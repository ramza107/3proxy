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
 * Content block on the painting field.
 * Soft solid surface so titles/meta never wash into the backdrop.
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
    backgroundColor: 'rgba(250,252,251,0.94)',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  blockEmph: {
    backgroundColor: colors.bgCardSolid,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#0F2A32',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
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
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  meta: {
    color: colors.textMuted,
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
