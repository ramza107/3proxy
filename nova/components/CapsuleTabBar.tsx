import { BlurView } from 'expo-blur'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, radii } from '../constants/theme'
import { TabBarIcon, type TabIconName } from './TabBarIcon'

const ROUTE_ICON: Record<string, TabIconName> = {
  tasks: 'tasks',
  home: 'home',
  settings: 'settings',
}

/**
 * Floating frosted capsule — Variant A.
 * Sits above the home indicator; painting shows around it.
 */
export function CapsuleTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 14 : 10)

  const visible = state.routes.filter((route) => {
    const opts = descriptors[route.key]?.options
    // Expo Router hides with href: null — those never appear in state.routes for tabs usually,
    // but still skip anything without a standard icon map entry.
    return !!ROUTE_ICON[route.name]
  })

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.capsule}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, styles.webFrost]} />
        ) : (
          <BlurView intensity={48} tint="light" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.frostTint} />
        <View style={styles.row}>
          {visible.map((route) => {
            const index = state.routes.findIndex((r) => r.key === route.key)
            const focused = state.index === index
            const { options } = descriptors[route.key]
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : typeof options.title === 'string'
                  ? options.title
                  : route.name
            const iconName = ROUTE_ICON[route.name] || 'home'
            const color = focused ? colors.accentStrong : colors.textMuted

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params)
              }
            }

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={onPress}
                style={styles.item}
              >
                <View style={[styles.pill, focused && styles.pillActive]}>
                  <TabBarIcon name={iconName} focused={focused} color={color} />
                </View>
                <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  capsule: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl + 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,42,50,0.12)',
    shadowColor: '#0F2A32',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(250,252,251,0.72)' : 'rgba(250,252,251,0.94)',
  },
  webFrost: {
    backgroundColor: 'rgba(250,252,251,0.92)',
  },
  frostTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(245,249,250,0.42)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 68,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingVertical: 0,
  },
  /** Active wash sits only behind the icon — never over the title. */
  pill: {
    minWidth: 48,
    height: 30,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  pillActive: {
    backgroundColor: 'rgba(15,110,102,0.14)',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    letterSpacing: 0.1,
    textAlign: 'center',
    marginTop: 0,
  },
  labelActive: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
  },
})
