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
  /**
   * Also fill parent height (Home launcher tiles). Do NOT use inside vertical
   * ScrollView rows — height:100% / flexGrow swallowed News digest pans.
   */
  fill?: boolean
}

/**
 * Soft scale on press — presence without bounce noise.
 *
 * Important: do NOT put `flex: 1` on the inner view by default. That expands the
 * touch target in parent flex layouts and can swallow ScrollView pans on iOS
 * (Home stopped scrolling; Plan day looked dead; News trapped the lead card).
 */
export function SoftPressable({
  children,
  onPress,
  disabled,
  style,
  hitSlop,
  stretch,
  fill,
}: Props) {
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const fillBox = Boolean(fill)
  const stretchBox = Boolean(stretch || fill)

  return (
    <Pressable
      style={[
        styles.base,
        stretchBox && styles.stretch,
        fill && styles.fillPressable,
        style,
      ]}
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
          fillBox ? styles.fillInner : stretchBox ? styles.stretchInner : styles.inner,
          anim,
        ]}
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
  fillPressable: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretchInner: {
    // Width only — never height/flexGrow 100%. That swallowed ScrollView
    // children on News (one ghost lead, rest unreachable).
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  fillInner: {
    alignSelf: 'stretch',
    width: '100%',
    height: '100%',
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
})
