import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, spacing } from '../constants/theme'
import { useT } from '../lib/useT'
import { BottomSheet } from './BottomSheet'

type Props = {
  visible: boolean
  onClose: () => void
  planning?: boolean
  showEvening?: boolean
  onPlanDay: () => void
  onOpenChat: () => void
  onOpenTasks: () => void
  onOpenBills?: () => void
  onOpenSettings: () => void
  onOpenEvening?: () => void
  onOpenMorning?: () => void
  onOpenWeekly?: () => void
}

/** Floating “more” menu — rituals and destinations without another tab. */
export function QuickActionsSheet({
  visible,
  onClose,
  planning,
  showEvening,
  onPlanDay,
  onOpenChat,
  onOpenTasks,
  onOpenBills,
  onOpenSettings,
  onOpenEvening,
  onOpenMorning,
  onOpenWeekly,
}: Props) {
  const t = useT()
  const run = (fn: () => void) => {
    onClose()
    setTimeout(fn, 80)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('quick.title')} scroll={false}>
      <View style={styles.list}>
        <Action
          label={planning ? t('home.planning') : t('home.planDay')}
          sub={t('quick.packGaps')}
          onPress={() => run(onPlanDay)}
          disabled={!!planning}
        />
        <Action
          label={t('quick.chat')}
          sub={t('quick.chatSub')}
          onPress={() => run(onOpenChat)}
        />
        <Action
          label={t('quick.tasks')}
          sub={t('quick.tasksSub')}
          onPress={() => run(onOpenTasks)}
        />
        {onOpenBills ? (
          <Action
            label={t('quick.bills')}
            sub={t('quick.billsSub')}
            onPress={() => run(onOpenBills)}
          />
        ) : null}
        {onOpenMorning ? (
          <Action
            label={t('quick.morning')}
            sub={t('quick.morningSub')}
            onPress={() => run(onOpenMorning)}
          />
        ) : null}
        {onOpenWeekly ? (
          <Action
            label={t('quick.weekly')}
            sub={t('quick.weeklySub')}
            onPress={() => run(onOpenWeekly)}
          />
        ) : null}
        {showEvening && onOpenEvening ? (
          <Action
            label={t('home.eveningClear')}
            sub={t('quick.eveningSub')}
            onPress={() => run(onOpenEvening)}
          />
        ) : null}
        <Action
          label={t('tabs.settings')}
          sub={t('quick.settingsSub')}
          onPress={() => run(onOpenSettings)}
        />
      </View>
      <Pressable onPress={onClose} style={styles.cancel}>
        <Text style={styles.cancelText}>{t('home.close')}</Text>
      </Pressable>
    </BottomSheet>
  )
}

function Action({
  label,
  sub,
  onPress,
  disabled,
}: {
  label: string
  sub: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      style={[styles.row, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.node} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Text style={styles.chev}>→</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  disabled: { opacity: 0.45 },
  node: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: colors.signal,
  },
  label: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  sub: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  chev: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 16 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: 4 },
  cancelText: { color: colors.textMuted, fontFamily: fonts.bodyMedium },
})
