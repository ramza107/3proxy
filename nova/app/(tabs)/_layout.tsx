import { Tabs } from 'expo-router'
import { Platform, Text, View } from 'react-native'
import { colors, fonts } from '../../constants/theme'

function TabIcon({ mark, focused }: { mark: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text
        style={{
          color: focused ? colors.accentStrong : colors.textDim,
          fontSize: focused ? 13 : 11,
          fontFamily: fonts.bodyBold,
          letterSpacing: focused ? 0.6 : 0,
        }}
      >
        {mark}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(244,247,249,0.92)',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 78 : 64,
          paddingBottom: Platform.OS === 'ios' ? 22 : 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarActiveTintColor: colors.accentStrong,
        tabBarInactiveTintColor: colors.textDim,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon mark={focused ? '◆' : '◇'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Wahrly',
          tabBarIcon: ({ focused }) => <TabIcon mark={focused ? '✦' : '✧'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => <TabIcon mark={focused ? '▣' : '▢'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon mark={focused ? '⚙' : '○'} focused={focused} />,
        }}
      />
    </Tabs>
  )
}
