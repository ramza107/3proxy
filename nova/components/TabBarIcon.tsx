import { useEffect } from 'react'
import { type ColorValue, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { BrushIcon, type BrushIconName } from './BrushIcon'

export type TabIconName = Extract<BrushIconName, 'tasks' | 'home' | 'settings' | 'news' | 'bills' | 'life' | 'dates' | 'invest'>

type Props = {
  name: TabIconName
  focused: boolean
  color: ColorValue
}

/** Tab glyph — brush icons with a soft spring when selected. */
export function TabBarIcon({ name, focused, color }: Props) {
  const scale = useSharedValue(focused ? 1 : 0.92)

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, { damping: 16, stiffness: 240 })
  }, [focused, scale])

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <View style={styles.slot}>
      <Animated.View style={wrapStyle}>
        <BrushIcon name={name} size={22} color={color} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  slot: {
    width: 40,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
