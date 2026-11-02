import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  title: string
  sub?: string
  /** Soft pill on the right (counts, status). */
  chip?: string
  chipQuiet?: boolean
  children?: ReactNode
}

/** Shared Home/Tasks mist header — serif title on the field, no solid white slab. */
export function MistScreenHero({ title, sub, chip, chipQuiet, children }: Props) {
  return (
    <View style={styles.hero}>
      <View style={styles.top}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {chip ? (
          <View style={[styles.chip, chipQuiet && styles.chipQuiet]}>
            <Text style={[styles.chipText, chipQuiet && styles.chipTextQuiet]}>{chip}</Text>
          </View>
        ) : null}
      </View>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  title: {
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 44,
    letterSpacing: -1.6,
    lineHeight: 48,
    flexShrink: 1,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,110,102,0.16)',
  },
  chipQuiet: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderColor: 'rgba(15,42,50,0.1)',
  },
  chipText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.15,
  },
  chipTextQuiet: {
    color: colors.textMuted,
  },
  sub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
  },
  body: {
    marginTop: 8,
    gap: 8,
  },
})
