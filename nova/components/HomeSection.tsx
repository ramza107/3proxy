import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, spacing } from '../constants/theme'

type Props = {
  title: string
  meta?: string
  action?: ReactNode
  children: ReactNode
  /** Larger zone title (Today / From Google / Ask) */
  zone?: boolean
}

/** Shared Home section chrome — hairline head + optional count/meta, like Bills. */
export function HomeSection({ title, meta, action, children, zone }: Props) {
  return (
    <View style={[styles.wrap, zone && styles.zone]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={zone ? styles.zoneTitle : styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  zone: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headText: { flex: 1, gap: 2 },
  zoneTitle: {
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
  },
  action: { paddingBottom: 1 },
  body: { gap: 8 },
})
