import { StyleSheet, Text, View } from 'react-native'
import { BottomSheet } from './BottomSheet'
import { SoftPressable } from './SoftPressable'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { useT } from '../lib/useT'

type Props = {
  visible: boolean
  title: string
  onConfirm: () => void
  onClose: () => void
}

/** Home-style confirm — soft sheet, serif title, ink CTA (not system Alert). */
export function ConfirmDoneSheet({ visible, title, onConfirm, onClose }: Props) {
  const t = useT()

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('tasks.confirmDoneTitle')}
      subtitle={t.tf('tasks.confirmDoneBody', { title })}
      scroll={false}
      footer={
        <View style={styles.actions}>
          <SoftPressable style={styles.confirm} onPress={onConfirm} stretch>
            <Text style={styles.confirmText}>{t('tasks.confirmDone')}</Text>
          </SoftPressable>
          <SoftPressable style={styles.cancel} onPress={onClose} stretch>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </SoftPressable>
        </View>
      }
    >
      <View style={styles.preview}>
        <View style={styles.checkPreview}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.previewTitle} numberOfLines={3}>
          {title}
        </Text>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(250,252,251,0.96)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checkPreview: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgDeep,
  },
  checkMark: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
  },
  previewTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  actions: {
    gap: 10,
    paddingBottom: 4,
  },
  confirm: {
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  cancel: {
    height: 48,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
})
