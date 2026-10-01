import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect } from 'react'
import { type ColorValue, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { colors } from '../constants/theme'

export type TabIconName = 'tasks' | 'home' | 'news' | 'bills' | 'settings'

const ICONS: Record<
  TabIconName,
  { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
> = {
  tasks: { active: 'checkmark-done', idle: 'checkmark-done-outline' },
  home: { active: 'home', idle: 'home-outline' },
  news: { active: 'newspaper', idle: 'newspaper-outline' },
  bills: { active: 'wallet', idle: 'wallet-outline' },
  settings: { active: 'settings', idle: 'settings-outline' },
}

type Props = {
  name: TabIconName
  focused: boolean
  color: ColorValue
}

/** Tab glyph with a soft spring + teal glow when selected. */
export function TabBarIcon({ name, focused, color }: Props) {
  const scale = useSharedValue(focused ? 1 : 0.92)
  const glow = useSharedValue(focused ? 1 : 0)
  const icons = ICONS[name]

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, { damping: 16, stiffness: 240 })
    glow.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 200 })
  }, [focused, glow, scale])

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.9,
    transform: [{ scale: 0.85 + glow.value * 0.15 }],
  }))

  return (
    <View style={styles.slot}>
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />
      <Animated.View style={wrapStyle}>
        <Ionicons
          name={focused ? icons.active : icons.idle}
          size={22}
          color={color}
        />
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
  glow: {
    position: 'absolute',
    top: -1,
    bottom: -1,
    left: 4,
    right: 4,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
  },
})
