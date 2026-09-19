import { LinearGradient } from 'expo-linear-gradient'
import { ReactNode, useEffect } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '../constants/theme'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

/** Atmospheric wash — same palette, quieter geometry, soft motion. */
export function Screen({ children, style }: Props) {
  const veil = useSharedValue(0)
  useEffect(() => {
    veil.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
  }, [veil])

  const veilStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + veil.value * 0.65,
  }))

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={['#F5F9FA', '#E7EEF2', '#DCE9E6']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.orb, styles.orbOne, veilStyle]} />
      <View style={[styles.orb, styles.orbTwo]} />
      <View style={[styles.orb, styles.orbThree]} />
      <LinearGradient
        colors={['rgba(15,42,50,0.04)', 'transparent']}
        style={styles.topVeil}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

type FadeProps = {
  children: ReactNode
  delay?: number
  style?: ViewStyle
}

/** Soft entrance for Home sections */
export function FadeUp({ children, delay = 0, style }: FadeProps) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    )
  }, [delay, t])
  const anim = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 14 }],
  }))
  return <Animated.View style={[anim, style]}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1 },
  topVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbOne: {
    width: 340,
    height: 340,
    top: -120,
    right: -90,
    backgroundColor: colors.accentGlow,
  },
  orbTwo: {
    width: 260,
    height: 260,
    bottom: 40,
    left: -100,
    backgroundColor: 'rgba(120, 160, 190, 0.16)',
  },
  orbThree: {
    width: 160,
    height: 160,
    top: '42%',
    right: -50,
    backgroundColor: 'rgba(15, 110, 102, 0.08)',
  },
})
