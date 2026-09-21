import { ReactNode, useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  visible: boolean
  onClose: () => void
  title?: string
  /** Soft subtitle under the title (Structured-style hierarchy). */
  subtitle?: string
  children: ReactNode
  /** Sticky footer below the scroll (CTAs stay visible). */
  footer?: ReactNode
  sheetStyle?: StyleProp<ViewStyle>
  scroll?: boolean
  /** Disable scrolling while dragging blocks. */
  scrollEnabled?: boolean
}

/**
 * Soft rising sheet — Structured-inspired: misted backdrop, Fraunces title,
 * slide + fade, sticky footer. Keeps Modal mounted through the exit animation.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  sheetStyle,
  scroll = true,
  scrollEnabled = true,
}: Props) {
  const insets = useSafeAreaInsets()
  const progress = useSharedValue(0)
  const canDismiss = useSharedValue(0)
  const [mounted, setMounted] = useState(visible)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      canDismiss.value = 0
      progress.value = withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) })
      const timer = setTimeout(() => {
        canDismiss.value = 1
      }, 220)
      return () => clearTimeout(timer)
    }
    if (mounted) {
      canDismiss.value = 0
      progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setMounted)(false)
      })
    }
  }, [visible, mounted, progress, canDismiss])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.42,
  }))

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 56 }],
    opacity: 0.55 + progress.value * 0.45,
  }))

  const requestClose = () => {
    if (canDismiss.value < 1) return
    onClose()
  }

  if (!mounted) return null

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.backdropFill, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
            accessibilityLabel="Close"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
            sheetStyle,
            sheetAnim,
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {title ? (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          ) : null}

          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
              bounces
              scrollEnabled={scrollEnabled}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F2A32',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    maxHeight: '92%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomWidth: 0,
    shadowColor: '#0F2A32',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(15,42,50,0.16)',
  },
  header: {
    marginBottom: spacing.md,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  scroll: {
    paddingBottom: spacing.md,
    gap: 4,
  },
  body: {
    flexGrow: 1,
  },
  footer: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 4,
  },
})
