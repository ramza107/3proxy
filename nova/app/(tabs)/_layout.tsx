import { Tabs } from 'expo-router'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { View } from 'react-native'
import { ChatFab } from '../../components/ChatFab'
import { colors } from '../../constants/theme'
import { t } from '../../lib/i18n'
import { useNovaStore } from '../../lib/store'

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
  const language = useNovaStore((s) => s.settings.language)

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="tasks"
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
          name="tasks"
          options={{
            title: t(language, 'tabs.tasks'),
            tabBarIcon: ({ focused }) => <SignalDot focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="home"
          options={{
            title: t(language, 'tabs.home'),
            tabBarIcon: ({ focused }) => <SignalDot focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="bills"
          options={{
            title: t(language, 'tabs.bills'),
            tabBarIcon: ({ focused }) => <SignalDot focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t(language, 'tabs.settings'),
            tabBarIcon: ({ focused }) => <SignalDot focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: t(language, 'tabs.chat'),
            href: null,
          }}
        />
      </Tabs>
      <ChatFab />
    </View>
  )
}
