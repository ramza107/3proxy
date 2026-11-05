import { Tabs } from 'expo-router'
import { type ColorValue, View } from 'react-native'
import { CapsuleTabBar } from '../../components/CapsuleTabBar'
import { ChatFab } from '../../components/ChatFab'
import { TabBarIcon, type TabIconName } from '../../components/TabBarIcon'
import { colors } from '../../constants/theme'
import { t } from '../../lib/i18n'
import { useNovaStore } from '../../lib/store'

function tabIcon(name: TabIconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue; size: number }) => (
    <TabBarIcon name={name} focused={focused} color={color} />
  )
}

export default function TabsLayout() {
  const language = useNovaStore((s) => s.settings.language)

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="tasks"
        // fade/shift + detachInactiveScreens can leave a tab blank on iOS
        // (native activityState stuck at 0). Keep screens mounted.
        detachInactiveScreens={false}
        tabBar={(props) => <CapsuleTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // Host bar is transparent — CapsuleTabBar floats above content.
          tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
          tabBarActiveTintColor: colors.accentStrong,
          tabBarInactiveTintColor: colors.textDim,
        }}
      >
        <Tabs.Screen
          name="tasks"
          options={{
            title: t(language, 'tabs.tasks'),
            tabBarIcon: tabIcon('tasks'),
          }}
        />
        <Tabs.Screen
          name="home"
          options={{
            title: t(language, 'tabs.home'),
            tabBarIcon: tabIcon('home'),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t(language, 'tabs.settings'),
            tabBarIcon: tabIcon('settings'),
          }}
        />
        {/* Everything else lives in Home → Menu. Keep routes mounted. */}
        <Tabs.Screen
          name="bills"
          options={{
            title: t(language, 'tabs.bills'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="dates"
          options={{
            title: t(language, 'tabs.dates'),
            href: null,
          }}
        />
        {/* Invest is Pro — keep off the primary bar so Free never opens into a paywall tab. */}
        <Tabs.Screen
          name="invest"
          options={{
            title: t(language, 'tabs.invest'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="life"
          options={{
            title: t(language, 'tabs.life'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            title: t(language, 'tabs.shopping'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: t(language, 'tabs.news'),
            href: null,
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
