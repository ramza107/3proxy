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
  /** Stretch children full width (lists / editorial rows). Default centers for buttons. */
  stretch?: boolean
}

/** Soft scale on press — presence without bounce noise. */
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
      style={style}
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
        style={[
          stretch
            ? { alignSelf: 'stretch', width: '100%' }
            : { alignItems: 'center', justifyContent: 'center', flex: 1 },
          anim,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}
