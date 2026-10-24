import { LinearGradient } from 'expo-linear-gradient'
import { Image, StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

/**
 * Painterly mist landscape with a soft readability scrim.
 * Painting stays visible as atmosphere; UI text keeps contrast.
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
      {/* Soft mist paper — not the old heavy wash, enough for gray body copy */}
      <LinearGradient
        colors={[
          'rgba(245,249,250,0.52)',
          'rgba(240,246,247,0.62)',
          'rgba(247,250,250,0.72)',
        ]}
        locations={[0, 0.4, 1]}
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
