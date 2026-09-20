import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, spacing } from '../constants/theme'
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
}: Props) {
  const run = (fn: () => void) => {
    onClose()
    // Let the sheet start closing before navigating
    setTimeout(fn, 80)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Quick actions" scroll={false}>
      <View style={styles.list}>
        <Action
          label={planning ? 'Planning…' : 'Plan day'}
          sub="Pack tasks into free gaps"
          onPress={() => run(onPlanDay)}
          disabled={!!planning}
        />
        <Action label="Chat with Wahrly" sub="Ask or dictate" onPress={() => run(onOpenChat)} />
        <Action label="All tasks" sub="Today, tomorrow, upcoming" onPress={() => run(onOpenTasks)} />
        {onOpenBills ? (
          <Action
            label="Bills"
            sub="Monthly rent, subs, utilities"
            onPress={() => run(onOpenBills)}
          />
        ) : null}
        {onOpenMorning ? (
          <Action
            label="Morning brief"
            sub="Weather + today’s list"
            onPress={() => run(onOpenMorning)}
          />
        ) : null}
        {showEvening && onOpenEvening ? (
          <Action
            label="Evening Clear"
            sub="Close today, shape tomorrow"
            onPress={() => run(onOpenEvening)}
          />
        ) : null}
        <Action label="Settings" sub="Rituals, Gmail, weather city" onPress={() => run(onOpenSettings)} />
      </View>
      <Pressable onPress={onClose} style={styles.cancel}>
        <Text style={styles.cancelText}>Close</Text>
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
