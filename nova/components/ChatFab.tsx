import { usePathname, useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandMark } from './BrandMark'
import { colors } from '../constants/theme'
import { t } from '../lib/i18n'
import { useNovaStore } from '../lib/store'

/** Match Home/Bills circular “+” FABs. */
export const FAB_SIZE = 54
export const FAB_RIGHT = 22
/** Space reserved under scroll content so last rows clear Chat / +. */
export const FAB_SCROLL_INSET = 120

const FAB_GAP = 12
/** Tab bar band above home-indicator — keep in sync with ChatFab bottom math. */
const TAB_BAR_BAND = 72

/** Compact icon Chat FAB — sits above local “+” on Home/Bills, alone elsewhere. */
export function ChatFab() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const language = useNovaStore((s) => s.settings.language)
  const scale = useSharedValue(1)

  const onChat = pathname.includes('/chat')
  const hasLocalFab = pathname.includes('/home') || pathname.includes('/bills')
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  if (onChat) return null

  // Same corner as “+”; stack above it when both are present
  let bottom = Math.max(insets.bottom, 8) + TAB_BAR_BAND
  if (hasLocalFab) bottom += FAB_SIZE + FAB_GAP

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom, right: FAB_RIGHT }]}>
      <Animated.View style={style}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(language, 'tabs.chat')}
          onPressIn={() => {
            scale.value = withSpring(0.92, { damping: 16, stiffness: 280 })
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 220 })
          }}
          onPress={() => router.push('/chat')}
          style={styles.btn}
        >
          <BrandMark size={22} color={colors.textOnAccent} />
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 50,
    elevation: 8,
  },
  btn: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentStrong,
    shadowColor: '#0F2A32',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
})
