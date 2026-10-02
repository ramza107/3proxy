import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ImportantDateEditor } from '../../components/ImportantDateEditor'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { dateLocale } from '../../lib/dateLocale'
import {
  daysUntilImportantDate,
  importantDateNext,
  sortImportantDates,
} from '../../lib/lifeDates'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import type { ImportantDate } from '../../types'

export default function DatesScreen() {
  const t = useT()
  const importantDates = useNovaStore((s) => s.importantDates)
  const createImportantDateLocal = useNovaStore((s) => s.createImportantDateLocal)
  const upsertImportantDate = useNovaStore((s) => s.upsertImportantDate)
  const removeImportantDate = useNovaStore((s) => s.removeImportantDate)

  const [editing, setEditing] = useState<ImportantDate | null>(null)
  const [creating, setCreating] = useState(false)

  const sorted = useMemo(() => sortImportantDates(importantDates), [importantDates])
  const upcoming = sorted.filter((d) => daysUntilImportantDate(d) <= 30)
  const later = sorted.filter((d) => daysUntilImportantDate(d) > 30)

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{t('dates.kicker')}</Text>
          <Text style={styles.title}>{t('dates.title')}</Text>
          <Text style={styles.sub}>{t('dates.sub')}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{upcoming.length}</Text>
            <Text style={styles.statLabel}>{t('dates.soon')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{sorted.length}</Text>
            <Text style={styles.statLabel}>{t('dates.total')}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('dates.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('dates.emptyText')}</Text>
            </View>
          ) : null}

          {upcoming.length > 0 ? (
            <Section title={t('dates.upcoming')} count={upcoming.length}>
              {upcoming.map((d) => (
                <DateRow
                  key={d.id}
                  date={d}
                  onPress={() => {
                    setCreating(false)
                    setEditing(d)
                  }}
                />
              ))}
            </Section>
          ) : null}

          {later.length > 0 ? (
            <Section title={t('dates.later')} count={later.length}>
              {later.map((d) => (
                <DateRow
                  key={d.id}
                  date={d}
                  onPress={() => {
                    setCreating(false)
                    setEditing(d)
                  }}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>

        <SoftPressable
          style={styles.fab}
          onPress={() => {
            setCreating(true)
            setEditing(null)
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </SoftPressable>

        <ImportantDateEditor
          visible={creating || !!editing}
          creating={creating}
          date={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={(patch) => {
            if (creating) {
              createImportantDateLocal(patch)
              return
            }
            if (editing) {
              upsertImportantDate({
                ...editing,
                ...patch,
                updated_at: new Date().toISOString(),
              })
            }
          }}
          onDelete={
            editing && !creating
              ? () => {
                  removeImportantDate(editing.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Screen>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {children}
    </View>
  )
}

function DateRow({ date, onPress }: { date: ImportantDate; onPress: () => void }) {
  const t = useT()
  const next = importantDateNext(date)
  const days = daysUntilImportantDate(date)
  const nextLabel = format(next, 'd MMMM', { locale: dateLocale(t.language) })
  let whenLabel = t.tf('dates.inDays', { n: days })
  if (days === 0) whenLabel = t('dates.today')
  else if (days === 1) whenLabel = t('dates.tomorrow')
  else if (days <= 14) whenLabel = t.tf('dates.inDays', { n: days })

  const age =
    date.year && date.kind === 'birthday'
      ? next.getFullYear() - date.year
      : null

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.node, days <= 14 && styles.nodeSoon]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{date.title}</Text>
        <Text style={styles.rowMeta}>
          {t(`dates.kind.${date.kind}`)}
          {date.person ? ` · ${date.person}` : ''}
          {age != null && age > 0 ? ` · ${t.tf('dates.turns', { n: age })}` : ''}
        </Text>
        <Text style={[styles.rowDue, days <= 14 && styles.rowDueSoon]}>
          {nextLabel} · {whenLabel}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: 4,
    marginBottom: 10,
  },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontFamily: fonts.brand,
    letterSpacing: -0.8,
  },
  sub: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    gap: 2,
  },
  statValue: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 20 },
  statLabel: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 140, gap: 8 },
  section: { marginTop: 10, gap: 2 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  sectionTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  sectionCount: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 13 },
  empty: { paddingVertical: spacing.lg, gap: 8 },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  node: {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  nodeSoon: { backgroundColor: colors.warning },
  rowTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16 },
  rowMeta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  rowDue: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 3 },
  rowDueSoon: { color: colors.warning },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 40,
  },
  fabText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    marginTop: -2,
  },
})
