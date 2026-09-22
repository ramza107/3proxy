import { usePathname, useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandMark } from './BrandMark'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { t } from '../lib/i18n'
import { useNovaStore } from '../lib/store'

/** Floating Wahrly chat control — available on every tab except Chat itself. */
export function ChatFab() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const language = useNovaStore((s) => s.settings.language)
  const scale = useSharedValue(1)

  const onChat = pathname.includes('/chat')
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  if (onChat) return null

  // Sit above the tab bar (~64) + safe area
  const bottom = Math.max(insets.bottom, 8) + 72

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(language, 'tabs.chat')}
          onPressIn={() => {
            scale.value = withSpring(0.94, { damping: 16, stiffness: 280 })
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 220 })
          }}
          onPress={() => router.push('/chat')}
          style={styles.btn}
        >
          <BrandMark size={22} color={colors.textOnAccent} />
          <Text style={styles.label}>{t(language, 'tabs.chat')}</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 50,
    elevation: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    backgroundColor: colors.accentStrong,
    shadowColor: '#0F2A32',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.textOnAccent,
    letterSpacing: 0.2,
  },
})
