import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  title: string
  meta?: string
  action?: ReactNode
  children: ReactNode
  emphasize?: boolean
}

/** Soft mist panel for Tasks days — matches Home frosted tiles, not solid white slabs. */
export function TasksDayBlock({ title, meta, action, children, emphasize }: Props) {
  return (
    <View style={[styles.block, emphasize && styles.blockEmph]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={emphasize ? styles.titleLg : styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,110,102,0.12)',
  },
  blockEmph: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderColor: 'rgba(15,110,102,0.18)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 2,
  },
  headText: { flex: 1, gap: 3 },
  titleLg: {
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  title: {
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  action: { paddingTop: 4 },
  body: { gap: 4 },
})
