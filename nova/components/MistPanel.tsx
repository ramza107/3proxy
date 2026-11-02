import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  title?: string
  meta?: string
  children: ReactNode
  emphasize?: boolean
}

/** Frosted content panel — same language as Tasks day blocks / Home tiles. */
export function MistPanel({ title, meta, children, emphasize }: Props) {
  return (
    <View style={[styles.panel, emphasize && styles.panelEmph]}>
      {title ? (
        <View style={styles.head}>
          <Text style={emphasize ? styles.titleLg : styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,110,102,0.12)',
  },
  panelEmph: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderColor: 'rgba(15,110,102,0.18)',
  },
  head: { gap: 3, marginBottom: 2 },
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
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  body: { gap: 6 },
})
