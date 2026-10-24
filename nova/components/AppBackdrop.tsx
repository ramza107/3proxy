import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

/**
 * Shared field — same cool mist teal, without blob orbs.
 * Soft sky gradient + fine grain for depth.
 */
export function AppBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <LinearGradient
        colors={['#D5E4EA', '#E4EEF1', '#EEF4F5', '#F4F8F9']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Quiet teal lift from the top — light, not a circle */}
      <LinearGradient
        colors={['rgba(15,110,102,0.09)', 'rgba(15,110,102,0.03)', 'transparent']}
        locations={[0, 0.35, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topLift}
      />
      {/* Soft depth from the bottom edge */}
      <LinearGradient
        colors={['transparent', 'rgba(15,42,50,0.04)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomDepth}
      />
      <Image
        source={require('../assets/mist-grain.png')}
        style={styles.grain}
        resizeMode="repeat"
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
  topLift: {
    ...StyleSheet.absoluteFill,
  },
  bottomDepth: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  grain: {
    ...StyleSheet.absoluteFill,
    opacity: 0.55,
  },
})
