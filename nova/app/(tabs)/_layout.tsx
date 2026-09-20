import { Tabs } from 'expo-router'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { colors } from '../../constants/theme'

function SignalDot({ focused }: { focused: boolean }) {
  const scale = useSharedValue(focused ? 1 : 0.75)

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.75, { damping: 16, stiffness: 220 })
  }, [focused, scale])

  const style = useAnimatedStyle(() => ({
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: focused ? colors.signal : colors.signalMuted,
    opacity: focused ? 1 : 0.55,
    transform: [{ scale: scale.value }],
  }))

  return <Animated.View style={style} />
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accentStrong,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <SignalDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Wahrly',
          tabBarIcon: ({ focused }) => (
            <BrandMark size={22} color={focused ? colors.signal : colors.signalMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <SignalDot focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: null,
        }}
      />
    </Tabs>
  )
}
