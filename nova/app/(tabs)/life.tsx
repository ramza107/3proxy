import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BodyEntryEditor } from '../../components/BodyEntryEditor'
import { LifeAdminEditor } from '../../components/LifeAdminEditor'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { dateLocale } from '../../lib/dateLocale'
import { daysUntilExpiry, sortLifeAdmin } from '../../lib/lifeDates'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import type { BodyEntry, LifeAdminItem } from '../../types'

type Segment = 'admin' | 'body'

export default function LifeScreen() {
  const t = useT()
  const lifeAdmin = useNovaStore((s) => s.lifeAdmin)
  const bodyEntries = useNovaStore((s) => s.bodyEntries)
  const createLifeAdminLocal = useNovaStore((s) => s.createLifeAdminLocal)
  const upsertLifeAdmin = useNovaStore((s) => s.upsertLifeAdmin)
  const removeLifeAdmin = useNovaStore((s) => s.removeLifeAdmin)
  const createBodyEntryLocal = useNovaStore((s) => s.createBodyEntryLocal)
  const upsertBodyEntry = useNovaStore((s) => s.upsertBodyEntry)
  const removeBodyEntry = useNovaStore((s) => s.removeBodyEntry)

  const [segment, setSegment] = useState<Segment>('admin')
  const [editingLife, setEditingLife] = useState<LifeAdminItem | null>(null)
  const [creatingLife, setCreatingLife] = useState(false)
  const [editingBody, setEditingBody] = useState<BodyEntry | null>(null)
  const [creatingBody, setCreatingBody] = useState(false)

  const sortedLife = useMemo(() => sortLifeAdmin(lifeAdmin), [lifeAdmin])
  const sortedBody = useMemo(() => {
    return [...bodyEntries].sort((a, b) => {
      const da = a.date || '0000-00-00'
      const db = b.date || '0000-00-00'
      if (da !== db) return db.localeCompare(da)
      return b.created_at.localeCompare(a.created_at)
    })
  }, [bodyEntries])

  const soonCount = sortedLife.filter((x) => {
    const d = daysUntilExpiry(x)
    return d != null && d >= 0 && d <= 60
  }).length

  const openCreate = () => {
    if (segment === 'admin') {
      setCreatingLife(true)
      setEditingLife(null)
    } else {
      setCreatingBody(true)
      setEditingBody(null)
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{t('life.kicker')}</Text>
          <Text style={styles.title}>{t('life.title')}</Text>
          <Text style={styles.sub}>{t('life.sub')}</Text>
        </View>

        <View style={styles.segRow}>
          <SegChip
            label={t('life.tabAdmin')}
            active={segment === 'admin'}
            badge={soonCount > 0 ? String(soonCount) : undefined}
            onPress={() => setSegment('admin')}
          />
          <SegChip
            label={t('life.tabBody')}
            active={segment === 'body'}
            badge={sortedBody.length ? String(sortedBody.length) : undefined}
            onPress={() => setSegment('body')}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {segment === 'admin' ? (
            sortedLife.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('life.emptyTitle')}</Text>
                <Text style={styles.emptyText}>{t('life.emptyText')}</Text>
              </View>
            ) : (
              sortedLife.map((item) => (
                <LifeRow
                  key={item.id}
                  item={item}
                  onPress={() => {
                    setCreatingLife(false)
                    setEditingLife(item)
                  }}
                />
              ))
            )
          ) : sortedBody.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('body.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('body.emptyText')}</Text>
            </View>
          ) : (
            sortedBody.map((entry) => (
              <BodyRow
                key={entry.id}
                entry={entry}
                onPress={() => {
                  setCreatingBody(false)
                  setEditingBody(entry)
                }}
              />
            ))
          )}
        </ScrollView>

        <SoftPressable style={styles.fab} onPress={openCreate}>
          <Text style={styles.fabText}>+</Text>
        </SoftPressable>

        <LifeAdminEditor
          visible={creatingLife || !!editingLife}
          creating={creatingLife}
          item={editingLife}
          onClose={() => {
            setCreatingLife(false)
            setEditingLife(null)
          }}
          onSave={(patch) => {
            if (creatingLife) {
              createLifeAdminLocal(patch)
              return
            }
            if (editingLife) {
              upsertLifeAdmin({
                ...editingLife,
                ...patch,
                updated_at: new Date().toISOString(),
              })
            }
          }}
          onDelete={
            editingLife && !creatingLife
              ? () => {
                  removeLifeAdmin(editingLife.id)
                  setEditingLife(null)
                }
              : undefined
          }
        />

        <BodyEntryEditor
          visible={creatingBody || !!editingBody}
          creating={creatingBody}
          entry={editingBody}
          onClose={() => {
            setCreatingBody(false)
            setEditingBody(null)
          }}
          onSave={(patch) => {
            if (creatingBody) {
              createBodyEntryLocal(patch)
              return
            }
            if (editingBody) {
              upsertBodyEntry({
                ...editingBody,
                ...patch,
                updated_at: new Date().toISOString(),
              })
            }
          }}
          onDelete={
            editingBody && !creatingBody
              ? () => {
                  removeBodyEntry(editingBody.id)
                  setEditingBody(null)
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Screen>
  )
}

function SegChip({
  label,
  active,
  badge,
  onPress,
}: {
  label: string
  active: boolean
  badge?: string
  onPress: () => void
}) {
  return (
    <Pressable style={[styles.seg, active && styles.segOn]} onPress={onPress}>
      <Text style={[styles.segText, active && styles.segTextOn]}>{label}</Text>
      {badge ? (
        <View style={[styles.badge, active && styles.badgeOn]}>
          <Text style={[styles.badgeText, active && styles.badgeTextOn]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

function LifeRow({ item, onPress }: { item: LifeAdminItem; onPress: () => void }) {
  const t = useT()
  const days = daysUntilExpiry(item)
  let dueLabel = t('life.noExpiry')
  let urgent = false
  if (days != null) {
    if (days < 0) {
      dueLabel = t.tf('life.expiredDays', { n: Math.abs(days) })
      urgent = true
    } else if (days === 0) {
      dueLabel = t('life.expiresToday')
      urgent = true
    } else if (days === 1) {
      dueLabel = t('life.expiresTomorrow')
      urgent = true
    } else if (days <= 60) {
      dueLabel = t.tf('life.expiresIn', { n: days })
      urgent = days <= 30
    } else if (item.expiresOn) {
      dueLabel = format(new Date(`${item.expiresOn}T12:00:00`), 'd MMM yyyy', {
        locale: dateLocale(t.language),
      })
    }
  }

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.node, urgent && styles.nodeUrgent]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>
          {t(`life.kind.${item.kind}`)}
          {item.provider ? ` · ${item.provider}` : ''}
        </Text>
        <Text style={[styles.rowDue, urgent && styles.rowDueUrgent]}>{dueLabel}</Text>
      </View>
    </Pressable>
  )
}

function BodyRow({ entry, onPress }: { entry: BodyEntry; onPress: () => void }) {
  const t = useT()
  const dateLabel = entry.date
    ? format(new Date(`${entry.date}T12:00:00`), 'd MMM yyyy', {
        locale: dateLocale(t.language),
      })
    : t('common.noDate')

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.node} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{entry.title}</Text>
        <Text style={styles.rowMeta}>
          {t(`body.kind.${entry.kind}`)} · {dateLabel}
          {entry.provider ? ` · ${entry.provider}` : ''}
        </Text>
        {entry.notes ? (
          <Text style={styles.rowNotes} numberOfLines={2}>
            {entry.notes}
          </Text>
        ) : null}
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
  segRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: 8,
  },
  seg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
  },
  segOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  segText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 14 },
  segTextOn: { color: colors.accentStrong, fontFamily: fonts.bodyBold },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  badgeOn: { backgroundColor: colors.accent },
  badgeText: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 11 },
  badgeTextOn: { color: colors.textOnAccent },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 140, gap: 4 },
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
  nodeUrgent: { backgroundColor: colors.warning },
  rowTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16 },
  rowMeta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  rowDue: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 3 },
  rowDueUrgent: { color: colors.warning },
  rowNotes: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
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
