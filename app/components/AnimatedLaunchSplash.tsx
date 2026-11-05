import { LinearGradient } from 'expo-linear-gradient'
import { useEffect } from 'react'
import { Dimensions, Image, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

const ART = require('../assets/splash/launch-mist-glass.png')
const { width: SCREEN_W } = Dimensions.get('window')

type Props = {
  /** When true, play exit fade then call onFinished. */
  ready: boolean
  onFinished?: () => void
}

/**
 * Calm brand launch — mist glass art with a slow settle, soft light sweep,
 * and a thin progress hairline. No bouncing dots / radar rings.
 */
export function AnimatedLaunchSplash({ ready, onFinished }: Props) {
  const enter = useSharedValue(0)
  const drift = useSharedValue(0)
  const shimmer = useSharedValue(0)
  const progress = useSharedValue(0)
  const exit = useSharedValue(1)

  useEffect(() => {
    enter.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) })
    drift.value = withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) })
    shimmer.value = withDelay(
      700,
      withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      ),
    )
    progress.value = withTiming(0.72, { duration: 2400, easing: Easing.out(Easing.cubic) })
    return () => {
      cancelAnimation(drift)
      cancelAnimation(shimmer)
    }
  }, [drift, enter, progress, shimmer])

  useEffect(() => {
    if (!ready) return
    progress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    const t = setTimeout(() => {
      exit.value = withTiming(0, { duration: 680, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished && onFinished) runOnJS(onFinished)()
      })
    }, 380)
    return () => clearTimeout(t)
  }, [ready, exit, onFinished, progress])

  const sceneStyle = useAnimatedStyle(() => {
    const scale = interpolate(enter.value, [0, 1], [1.06, 1]) + interpolate(drift.value, [0, 1], [0, 0.025])
    const ty = interpolate(drift.value, [0, 1], [0, -10])
    return {
      opacity: interpolate(enter.value, [0, 0.2, 1], [0, 1, 1]) * exit.value,
      transform: [{ scale }, { translateY: ty }],
    }
  })

  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0, 1], [0.35, 0]) * exit.value,
  }))

  const shimmerStyle = useAnimatedStyle(() => {
    const x = interpolate(shimmer.value, [0, 1], [-SCREEN_W * 0.6, SCREEN_W * 0.85])
    return {
      opacity: interpolate(enter.value, [0.5, 1], [0, 0.55]) * exit.value,
      transform: [{ translateX: x }, { rotate: '-18deg' }],
    }
  })

  const barWrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0.55, 1], [0, 1]) * exit.value,
  }))

  const barFillStyle = useAnimatedStyle(() => ({
    width: 148 * Math.max(0.08, progress.value),
  }))

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[styles.scene, sceneStyle]}>
        <Image source={ART} style={styles.art} resizeMode="cover" />
        <Animated.View style={[styles.veil, veilStyle]} />
        <Animated.View style={[styles.shimmerSweep, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.barWrap, barWrapStyle]}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barFillStyle]} />
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#6E868C',
    zIndex: 100,
  },
  scene: {
    ...StyleSheet.absoluteFill,
  },
  art: {
    width: '100%',
    height: '100%',
  },
  veil: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F2A32',
  },
  shimmerSweep: {
    position: 'absolute',
    top: '-10%',
    bottom: '-10%',
    width: SCREEN_W * 0.42,
  },
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '11%',
    alignItems: 'center',
    paddingHorizontal: 72,
  },
  barTrack: {
    width: '100%',
    maxWidth: 148,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(15, 42, 50, 0.14)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(15, 42, 50, 0.42)',
  },
})
