import { LinearGradient } from 'expo-linear-gradient'
import { ReactNode } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { colors } from '../constants/theme'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

/** Soft dawn wash + glow orbs — brand atmosphere without flat fill. */
export function Screen({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={['#F3F7F9', '#E4EDF2', '#D9E8E4']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbOne]} />
      <View style={[styles.orb, styles.orbTwo]} />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbOne: {
    width: 280,
    height: 280,
    top: -60,
    right: -40,
    backgroundColor: colors.accentGlow,
  },
  orbTwo: {
    width: 220,
    height: 220,
    bottom: 80,
    left: -70,
    backgroundColor: 'rgba(120, 160, 190, 0.18)',
  },
})
