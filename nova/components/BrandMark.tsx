import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { brand, colors, fonts, spacing } from '../constants/theme'

type Props = {
  /** Show wordmark next to / under the icon. Default true. */
  showName?: boolean
  /** Icon edge length. Default 56. */
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Canonical Wahrly mark — same teal W asset as the home-screen icon. */
export function BrandMark({ showName = true, size = 56, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Image
        accessibilityIgnoresInvertColors
        source={require('../assets/icon.png')}
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
      />
      {showName ? <Text style={styles.name}>{brand.name}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    color: colors.accentStrong,
    fontSize: 22,
    fontFamily: fonts.brand,
    letterSpacing: -0.3,
  },
})
