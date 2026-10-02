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
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bgElevated,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: tabBarHeight,
            paddingBottom: bottomPad,
            paddingTop: 8,
            elevation: 8,
            shadowColor: '#0F2A32',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
          },
          tabBarActiveTintColor: colors.accentStrong,
          tabBarInactiveTintColor: colors.textDim,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: fonts.bodyMedium,
            fontWeight: '600',
            marginTop: 2,
          },
          animation: 'fade',
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
          name="life"
          options={{
            title: t(language, 'tabs.life'),
            tabBarIcon: tabIcon('life'),
          }}
        />
        <Tabs.Screen
          name="dates"
          options={{
            title: t(language, 'tabs.dates'),
            tabBarIcon: tabIcon('dates'),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t(language, 'tabs.settings'),
            tabBarIcon: tabIcon('settings'),
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
          name="bills"
          options={{
            title: t(language, 'tabs.bills'),
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
