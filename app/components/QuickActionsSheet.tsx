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
  /** @deprecated kept for callers — Tasks lives on the tab bar */
  onOpenChat?: () => void
  onOpenTasks?: () => void
  onOpenBills?: () => void
  onOpenDates?: () => void
  onOpenLife?: () => void
  onOpenShopping?: () => void
  onOpenInvest?: () => void
  onOpenNews?: () => void
  /** @deprecated kept for callers — Settings lives on the tab bar */
  onOpenSettings?: () => void
  onOpenEvening?: () => void
  onOpenMorning?: () => void
  onOpenWeekly?: () => void
}

type Tile = {
  key: string
  label: string
  onPress: () => void
}

type Ritual = {
  key: string
  label: string
  onPress: () => void
  disabled?: boolean
}

/**
 * Destinations that are NOT on the 3-tab bar.
 * Grid of spaces + a short ritual strip — no duplicate Tasks/Settings/Chat.
 */
export function QuickActionsSheet({
  visible,
  onClose,
  planning,
  showEvening,
  onPlanDay,
  onOpenBills,
  onOpenDates,
  onOpenLife,
  onOpenShopping,
  onOpenInvest,
  onOpenNews,
  onOpenEvening,
  onOpenMorning,
  onOpenWeekly,
}: Props) {
  const t = useT()
  const run = (fn: () => void) => {
    onClose()
    setTimeout(fn, 80)
  }

  const spaces: Tile[] = []
  if (onOpenBills) {
    spaces.push({ key: 'bills', label: t('quick.bills'), onPress: () => run(onOpenBills) })
  }
  if (onOpenDates) {
    spaces.push({ key: 'dates', label: t('quick.dates'), onPress: () => run(onOpenDates) })
  }
  if (onOpenShopping) {
    spaces.push({
      key: 'shopping',
      label: t('quick.shopping'),
      onPress: () => run(onOpenShopping),
    })
  }
  if (onOpenLife) {
    spaces.push({ key: 'life', label: t('quick.life'), onPress: () => run(onOpenLife) })
  }
  if (onOpenNews) {
    spaces.push({ key: 'news', label: t('tabs.news'), onPress: () => run(onOpenNews) })
  }
  if (onOpenInvest) {
    spaces.push({
      key: 'invest',
      label: t('quick.invest'),
      onPress: () => run(onOpenInvest),
    })
  }

  const rituals: Ritual[] = [
    {
      key: 'plan',
      label: planning ? t('home.planning') : t('home.planDay'),
      onPress: () => run(onPlanDay),
      disabled: !!planning,
    },
  ]
  if (onOpenMorning) {
    rituals.push({
      key: 'morning',
      label: t('quick.morning'),
      onPress: () => run(onOpenMorning),
    })
  }
  if (showEvening && onOpenEvening) {
    rituals.push({
      key: 'evening',
      label: t('home.eveningClear'),
      onPress: () => run(onOpenEvening),
    })
  }
  if (onOpenWeekly) {
    rituals.push({
      key: 'weekly',
      label: t('quick.weekly'),
      onPress: () => run(onOpenWeekly),
    })
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('quick.title')}
      subtitle={t('quick.subtitle')}
      scroll
    >
      <Text style={styles.sectionLabel}>{t('quick.sectionSpaces')}</Text>
      <View style={styles.grid}>
        {spaces.map((tile) => (
          <Pressable
            key={tile.key}
            style={styles.tile}
            onPress={tile.onPress}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
          >
            <Text style={styles.tileMark}>{markFor(tile.key)}</Text>
            <Text style={styles.tileLabel} numberOfLines={2}>
              {tile.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {rituals.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>{t('quick.sectionRituals')}</Text>
          <View style={styles.ritualList}>
            {rituals.map((r) => (
              <Pressable
                key={r.key}
                style={[styles.ritualRow, r.disabled && styles.disabled]}
                onPress={r.onPress}
                disabled={r.disabled}
                accessibilityRole="button"
              >
                <Text style={styles.ritualLabel}>{r.label}</Text>
                <Text style={styles.ritualChev}>→</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </BottomSheet>
  )
}

/** Stable Latin marks — not locale-dependent first letters. */
function markFor(key: string) {
  const marks: Record<string, string> = {
    bills: 'B',
    dates: 'D',
    shopping: 'S',
    life: 'L',
    news: 'N',
    invest: 'I',
  }
  return marks[key] || (key.charAt(0) || '?').toUpperCase()
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionSpaced: { marginTop: spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: '42%',
    maxWidth: '48.5%',
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 8,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  tileMark: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  tileLabel: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
  },
  ritualList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ritualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ritualLabel: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  ritualChev: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  disabled: { opacity: 0.45 },
})
