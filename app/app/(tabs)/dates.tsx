import { format } from 'date-fns'
import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { FAB_RIGHT, FAB_SCROLL_INSET, FAB_SIZE, localFabBottom } from '../../components/ChatFab'
import { ImportantDateEditor } from '../../components/ImportantDateEditor'
import { MistPanel } from '../../components/MistPanel'
import { MistScreenHero } from '../../components/MistScreenHero'
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
  const insets = useSafeAreaInsets()
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
        <MistScreenHero
          title={t('dates.title')}
          sub={t('dates.sub')}
          chip={
            upcoming.length > 0
              ? t.tf('dates.soonChip', { n: upcoming.length })
              : sorted.length > 0
                ? t.tf('dates.totalChip', { n: sorted.length })
                : undefined
          }
          chipQuiet={upcoming.length === 0}
        />

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sorted.length === 0 ? (
            <MistPanel emphasize>
              <Text style={styles.emptyTitle}>{t('dates.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('dates.emptyText')}</Text>
              <Pressable
                style={styles.sampleBtn}
                onPress={() => {
                  setCreating(true)
                  setEditing(null)
                }}
              >
                <Text style={styles.sampleBtnText}>{t('dates.newDate')}</Text>
              </Pressable>
            </MistPanel>
          ) : null}

          {upcoming.length > 0 ? (
            <Section title={t('dates.upcoming')} meta={String(upcoming.length)}>
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
            <Section title={t('dates.later')} meta={String(later.length)}>
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
          style={[
            styles.fab,
            {
              bottom: localFabBottom(insets.bottom),
              right: FAB_RIGHT,
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: FAB_SIZE / 2,
            },
          ]}
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
  meta,
  children,
}: {
  title: string
  meta: string
  children: ReactNode
}) {
  return (
    <MistPanel title={title} meta={meta}>
      {children}
    </MistPanel>
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
    date.year && date.kind === 'birthday' ? next.getFullYear() - date.year : null

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.node, days <= 14 && styles.nodeSoon]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{date.title}</Text>
        <Text style={styles.rowMeta}>
          {t.kind('dates', date.kind)}
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: FAB_SCROLL_INSET, gap: 10 },
  emptyTitle: {
    color: colors.bgDeep,
    fontFamily: fonts.brand,
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  sampleBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleBtnText: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,110,102,0.12)',
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
    bottom: 96,
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
