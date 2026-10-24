import { Tabs } from 'expo-router'
import { type ColorValue, Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatFab } from '../../components/ChatFab'
import { TabBarIcon, type TabIconName } from '../../components/TabBarIcon'
import { colors, fonts } from '../../constants/theme'
import { t } from '../../lib/i18n'
import { useNovaStore } from '../../lib/store'

function tabIcon(name: TabIconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue; size: number }) => (
    <TabBarIcon name={name} focused={focused} color={color} />
  )
}

export default function TabsLayout() {
  const language = useNovaStore((s) => s.settings.language)
  const insets = useSafeAreaInsets()
  // Expo Router defaults the tab bar to 49px unless `height` is set — too short for
  // real icons + labels. Height includes padding (RN box model).
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 8)
  const tabBarHeight = 64 + bottomPad

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="tasks"
        // fade/shift + detachInactiveScreens can leave a tab blank on iOS
        // (native activityState stuck at 0). Keep screens mounted.
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bgCardSolid,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: tabBarHeight,
            paddingBottom: bottomPad,
            paddingTop: 8,
            elevation: 4,
            shadowColor: '#0F2A32',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: -2 },
          },
          tabBarActiveTintColor: colors.bgDeep,
          tabBarInactiveTintColor: colors.textDim,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: fonts.bodyMedium,
            fontWeight: '600',
            marginTop: 2,
          },
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
        {/* Everything else lives in Home → Menu (All tools). Keep routes mounted. */}
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
