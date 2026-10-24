import { Image, StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

/**
 * Shared field — painterly cool mist landscape, full strength.
 * No mist veil: the painting reads clearly behind the UI.
 */
export function AppBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={require('../assets/mist-painting-bg.jpg')}
        style={styles.painting}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  painting: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
})
