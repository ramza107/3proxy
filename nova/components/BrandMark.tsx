import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { brand, colors, fonts, spacing } from '../constants/theme'

type Props = {
  size?: number
  /**
   * When set, render the white W glyph tinted to this color
   * (for compact chrome on colored surfaces). Otherwise the full
   * teal app icon asset.
   */
  color?: string
  /** Show wordmark under the mark. Default false for compact chrome. */
  showName?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Canonical Wahrly mark — same teal W as the home-screen icon.
 * Pass `color` for a monochrome W (Chat FAB, header accents).
 */
export function BrandMark({ size = 36, color, showName = false, style }: Props) {
  if (color) {
    return (
      <View style={[{ width: size, height: size }, style]}>
        <Image
          accessibilityIgnoresInvertColors
          source={require('../assets/android-icon-foreground.png')}
          style={{ width: size, height: size, tintColor: color }}
          resizeMode="contain"
        />
      </View>
    )
  }

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
