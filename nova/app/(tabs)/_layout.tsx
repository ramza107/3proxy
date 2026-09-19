import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { BrandMark } from '../../components/BrandMark'
import { colors } from '../../constants/theme'

function SignalDot({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: focused ? 10 : 7,
        height: focused ? 10 : 7,
        borderRadius: 99,
        backgroundColor: focused ? colors.signal : colors.signalMuted,
      }}
    />
  )
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
          tabBarIcon: ({ focused }) => <SignalDot focused={focused} />,
        }}
      />
    </Tabs>
  )
}
