import { ReactNode } from 'react'
import { Pressable, StyleProp, ViewStyle } from 'react-native'
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
}

/** Soft scale on press — presence without bounce noise. */
export function SoftPressable({ children, onPress, disabled, style, hitSlop }: Props) {
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Pressable
      style={style}
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.96, { damping: 18, stiffness: 320 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 240 })
      }}
    >
      <Animated.View style={[{ alignItems: 'center', justifyContent: 'center', flex: 1 }, anim]}>
        {children}
      </Animated.View>
    </Pressable>
  )
}
