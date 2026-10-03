import { ReactNode } from 'react'
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

type Props = {
  children: ReactNode
  onPress?: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  hitSlop?: number
  /** Stretch children full width (lists / editorial rows). Default centers for buttons. */
  stretch?: boolean
}

/**
 * Soft scale on press — presence without bounce noise.
 *
 * Important: do NOT put `flex: 1` on the inner view. That expands the touch
 * target in parent flex layouts and can swallow ScrollView pans on iOS
 * (Home stopped scrolling; Plan day looked dead).
 */
export function SoftPressable({
  children,
  onPress,
  disabled,
  style,
  hitSlop,
  stretch,
}: Props) {
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Pressable
      style={[styles.base, stretch && styles.stretch, style]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.98, { damping: 20, stiffness: 340 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 })
      }}
    >
      <Animated.View
        style={[stretch ? styles.stretchInner : styles.inner, anim]}
        pointerEvents="none"
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretch: {
    alignSelf: 'stretch',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretchInner: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
