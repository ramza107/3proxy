import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

/**
 * Shared atmospheric field for the app — cool mist + soft teal light,
 * not a flat gray plate. Used by Screen so every tab shares one look.
 */
export function AppBackdrop() {
  return (
    <View style={styles.root} pointerEvents="none">
      <LinearGradient
        colors={['#BFD4DC', '#D9E7EC', '#EEF4F5', '#F7FAFA']}
        locations={[0, 0.28, 0.62, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(15,110,102,0.18)', 'rgba(15,110,102,0.04)', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.7 }}
        style={styles.glowTeal}
      />
      <LinearGradient
        colors={['rgba(15,42,50,0.10)', 'transparent']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.75, y: 1 }}
        style={styles.glowInk}
      />
      <View style={styles.orbTeal} />
      <View style={styles.orbMist} />
      <View style={styles.orbSoft} />
      {/* Quiet horizon band — anchors the field without a hard edge */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.horizon}
      />
      <View style={styles.veil} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  glowTeal: {
    position: 'absolute',
    top: -40,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
  },
  glowInk: {
    position: 'absolute',
    left: -100,
    bottom: '18%',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbTeal: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(15,110,102,0.16)',
  },
  orbMist: {
    position: 'absolute',
    top: '32%',
    left: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  orbSoft: {
    position: 'absolute',
    bottom: -40,
    right: '12%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(185,214,220,0.55)',
  },
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '42%',
    height: 120,
  },
  veil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(247,250,250,0.18)',
  },
})
