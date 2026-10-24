import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

/**
 * Shared field — painterly cool mist landscape behind every Screen.
 * Light veil keeps UI text readable on the darker paint.
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
      {/* Soft mist veil so tiles and type stay clear */}
      <LinearGradient
        colors={[
          'rgba(242,247,248,0.42)',
          'rgba(228,238,241,0.55)',
          'rgba(244,248,249,0.72)',
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
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
