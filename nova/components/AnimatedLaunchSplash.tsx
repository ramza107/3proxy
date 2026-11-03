import { useEffect } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const ART = require('../assets/splash/launch-mist-glass.png')

type Props = {
  /** When true, play exit fade then call onFinished. */
  ready: boolean
  onFinished?: () => void
}

/**
 * Brand launch overlay — mist glass orb art with a soft breathe + load pulse.
 * Native splash hands off into this; keep visible until fonts/store hydrate.
 */
export function AnimatedLaunchSplash({ ready, onFinished }: Props) {
  const enter = useSharedValue(0)
  const breathe = useSharedValue(0)
  const pulse = useSharedValue(0)
  const exit = useSharedValue(1)

  useEffect(() => {
    enter.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    breathe.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    )
    pulse.value = withDelay(
      550,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    )
    return () => {
      cancelAnimation(breathe)
      cancelAnimation(pulse)
    }
  }, [breathe, enter, pulse])

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => {
      exit.value = withTiming(0, { duration: 520, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished && onFinished) runOnJS(onFinished)()
      })
    }, 280)
    return () => clearTimeout(t)
  }, [ready, exit, onFinished])

  const sceneStyle = useAnimatedStyle(() => {
    const s = interpolate(enter.value, [0, 1], [1.08, 1]) + interpolate(breathe.value, [0, 1], [0, 0.018])
    return {
      opacity: enter.value * exit.value,
      transform: [{ scale: s }],
    }
  })

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.15, 1], [0, 0.45, 0]) * exit.value,
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.18]) }],
  }))

  const dotsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(enter.value, [0.4, 1], [0, 0.9]) * exit.value,
  }))

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[styles.scene, sceneStyle]}>
        <Image source={ART} style={styles.art} resizeMode="cover" />
        {/* Soft ring pulse around the glass orb region */}
        <Animated.View style={[styles.orbPulse, pulseStyle]} />
      </Animated.View>

      <Animated.View style={[styles.dotsRow, dotsStyle]}>
        <LoadingDots />
      </Animated.View>
    </View>
  )
}

function LoadingDots() {
  const a = useSharedValue(0)
  const b = useSharedValue(0)
  const c = useSharedValue(0)

  useEffect(() => {
    const beat = (v: typeof a, delay: number) => {
      v.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
            withTiming(0.25, { duration: 360, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          false,
        ),
      )
    }
    beat(a, 0)
    beat(b, 140)
    beat(c, 280)
    return () => {
      cancelAnimation(a)
      cancelAnimation(b)
      cancelAnimation(c)
    }
  }, [a, b, c])

  const sa = useAnimatedStyle(() => ({ opacity: 0.25 + a.value * 0.75, transform: [{ scale: 0.85 + a.value * 0.25 }] }))
  const sb = useAnimatedStyle(() => ({ opacity: 0.25 + b.value * 0.75, transform: [{ scale: 0.85 + b.value * 0.25 }] }))
  const sc = useAnimatedStyle(() => ({ opacity: 0.25 + c.value * 0.75, transform: [{ scale: 0.85 + c.value * 0.25 }] }))

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, sa]} />
      <Animated.View style={[styles.dot, sb]} />
      <Animated.View style={[styles.dot, sc]} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F6E66',
    zIndex: 100,
  },
  scene: {
    ...StyleSheet.absoluteFill,
  },
  art: {
    width: '100%',
    height: '100%',
  },
  orbPulse: {
    position: 'absolute',
    alignSelf: 'center',
    top: '34%',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'transparent',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '12%',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(15, 42, 50, 0.55)',
  },
})
