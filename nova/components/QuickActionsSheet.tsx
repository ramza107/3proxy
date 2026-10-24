import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
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
  onOpenDates?: () => void
  onOpenLife?: () => void
  onOpenShopping?: () => void
  onOpenInvest?: () => void
  onOpenSettings: () => void
  onOpenEvening?: () => void
  onOpenMorning?: () => void
  onOpenWeekly?: () => void
}

type ActionItem = {
  key: string
  label: string
  sub: string
  onPress: () => void
  disabled?: boolean
}

/**
 * App-wide destinations + rituals — opened from the labeled Menu control on Home.
 * Grouped so the sheet reads as a map of the product, not a mystery list.
 */
export function QuickActionsSheet({
  visible,
  onClose,
  planning,
  showEvening,
  onPlanDay,
  onOpenChat,
  onOpenTasks,
  onOpenBills,
  onOpenDates,
  onOpenLife,
  onOpenShopping,
  onOpenInvest,
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

  const day: ActionItem[] = [
    {
      key: 'plan',
      label: planning ? t('home.planning') : t('home.planDay'),
      sub: t('quick.packGaps'),
      onPress: () => run(onPlanDay),
      disabled: !!planning,
    },
  ]
  if (onOpenMorning) {
    day.push({
      key: 'morning',
      label: t('quick.morning'),
      sub: t('quick.morningSub'),
      onPress: () => run(onOpenMorning),
    })
  }
  if (onOpenWeekly) {
    day.push({
      key: 'weekly',
      label: t('quick.weekly'),
      sub: t('quick.weeklySub'),
      onPress: () => run(onOpenWeekly),
    })
  }
  if (showEvening && onOpenEvening) {
    day.push({
      key: 'evening',
      label: t('home.eveningClear'),
      sub: t('quick.eveningSub'),
      onPress: () => run(onOpenEvening),
    })
  }

  const tools: ActionItem[] = [
    {
      key: 'tasks',
      label: t('quick.tasks'),
      sub: t('quick.tasksSub'),
      onPress: () => run(onOpenTasks),
    },
  ]
  if (onOpenBills) {
    tools.push({
      key: 'bills',
      label: t('quick.bills'),
      sub: t('quick.billsSub'),
      onPress: () => run(onOpenBills),
    })
  }
  if (onOpenDates) {
    tools.push({
      key: 'dates',
      label: t('quick.dates'),
      sub: t('quick.datesSub'),
      onPress: () => run(onOpenDates),
    })
  }
  if (onOpenShopping) {
    tools.push({
      key: 'shopping',
      label: t('quick.shopping'),
      sub: t('quick.shoppingSub'),
      onPress: () => run(onOpenShopping),
    })
  }
  if (onOpenLife) {
    tools.push({
      key: 'life',
      label: t('quick.life'),
      sub: t('quick.lifeSub'),
      onPress: () => run(onOpenLife),
    })
  }
  if (onOpenInvest) {
    tools.push({
      key: 'invest',
      label: t('quick.invest'),
      sub: t('quick.investSub'),
      onPress: () => run(onOpenInvest),
    })
  }

  const app: ActionItem[] = [
    {
      key: 'chat',
      label: t('quick.chat'),
      sub: t('quick.chatSub'),
      onPress: () => run(onOpenChat),
    },
    {
      key: 'settings',
      label: t('tabs.settings'),
      sub: t('quick.settingsSub'),
      onPress: () => run(onOpenSettings),
    },
  ]

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('quick.title')}
      subtitle={t('quick.subtitle')}
      scroll
    >
      <Section title={t('quick.sectionDay')} items={day} />
      <Section title={t('quick.sectionTools')} items={tools} />
      <Section title={t('quick.sectionApp')} items={app} />
      <Pressable onPress={onClose} style={styles.cancel}>
        <Text style={styles.cancelText}>{t('home.close')}</Text>
      </Pressable>
    </BottomSheet>
  )
}

function Section({ title, items }: { title: string; items: ActionItem[] }) {
  if (items.length === 0) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <Action
          key={item.key}
          label={item.label}
          sub={item.sub}
          onPress={item.onPress}
          disabled={item.disabled}
        />
      ))}
    </View>
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
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      <Text style={styles.chev}>→</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  sectionTitle: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  disabled: { opacity: 0.45 },
  label: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  sub: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  chev: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 16 },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: 4,
    borderRadius: radii.full,
  },
  cancelText: { color: colors.textMuted, fontFamily: fonts.bodyMedium },
})
