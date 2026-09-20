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
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  visible: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Extra style for the sheet panel */
  sheetStyle?: StyleProp<ViewStyle>
  scroll?: boolean
}

/**
 * Shared bottom sheet — same language as TaskEditor.
 * Backdrop dismiss; web-safe delay so the open tap doesn’t close instantly.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  sheetStyle,
  scroll = true,
}: Props) {
  const [canDismiss, setCanDismiss] = useState(false)

  useEffect(() => {
    if (!visible) {
      setCanDismiss(false)
      return
    }
    setCanDismiss(false)
    const timer = setTimeout(() => setCanDismiss(true), 180)
    return () => clearTimeout(timer)
  }, [visible])

  const dismiss = () => {
    if (!canDismiss) return
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Close" />
        <View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,42,50,0.38)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  scroll: { paddingBottom: 8, gap: 4 },
})
