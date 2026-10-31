import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProSpaceLock } from '../../components/ProSpaceLock'
import { Screen } from '../../components/Screen'
import { ShoppingItemEditor } from '../../components/ShoppingItemEditor'
import { SoftPressable } from '../../components/SoftPressable'
import { FAB_RIGHT, FAB_SCROLL_INSET, FAB_SIZE, localFabBottom } from '../../components/ChatFab'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import {
  SHOPPING_AISLES,
  SHOPPING_SEEDS,
  aisleLabelKey,
  seedLabelKey,
  type ShoppingAisleId,
} from '../../lib/shoppingCatalog'
import { useIsPro } from '../../lib/pro'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import type { ShoppingItem } from '../../types'

export default function ShoppingScreen() {
  const t = useT()
  const insets = useSafeAreaInsets()
  const isPro = useIsPro()
  const shopping = useNovaStore((s) => s.shopping)
  const addShoppingQuick = useNovaStore((s) => s.addShoppingQuick)
  const createShoppingLocal = useNovaStore((s) => s.createShoppingLocal)
  const upsertShoppingItem = useNovaStore((s) => s.upsertShoppingItem)
  const removeShoppingItem = useNovaStore((s) => s.removeShoppingItem)
  const toggleShoppingBought = useNovaStore((s) => s.toggleShoppingBought)
  const clearBoughtShopping = useNovaStore((s) => s.clearBoughtShopping)

  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState('')
  const [aisle, setAisle] = useState<ShoppingAisleId>('dairy')

  const open = useMemo(
    () => shopping.filter((i) => !i.bought).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [shopping],
  )
  const bought = useMemo(
    () =>
      shopping
        .filter((i) => i.bought)
        .sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || '')),
    [shopping],
  )

  const openTitles = useMemo(
    () => new Set(open.map((i) => i.title.trim().toLowerCase())),
    [open],
  )

  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of [...shopping].sort((a, b) =>
      (b.boughtAt || b.updated_at).localeCompare(a.boughtAt || a.updated_at),
    )) {
      const key = item.title.trim().toLowerCase()
      if (!key || seen.has(key) || openTitles.has(key)) continue
      seen.add(key)
      out.push(item.title.trim())
      if (out.length >= 8) break
    }
    return out
  }, [shopping, openTitles])

  const seeds = useMemo(() => SHOPPING_SEEDS.filter((s) => s.aisle === aisle), [aisle])

  const submitDraft = () => {
    const title = draft.trim()
    if (!title) return
    addShoppingQuick({ title })
    setDraft('')
  }

  const total = open.length + bought.length
  const progress =
    total > 0 ? t.tf('shopping.progress', { bought: bought.length, total }) : null

  if (!isPro) {
    return (
      <ProSpaceLock
        kicker={t('shopping.kicker')}
        title={t('shopping.title')}
        sub={t('shopping.sub')}
        lockTitle={t('pro.spaceLockTitle')}
        lockText={t('pro.spaceLockShopping')}
      />
    )
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerPanel}>
            <Text style={styles.kicker}>{t('shopping.kicker')}</Text>
            <Text style={styles.title}>{t('shopping.title')}</Text>
            <Text style={styles.sub}>{t('shopping.sub')}</Text>

            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('shopping.composerPh')}
                placeholderTextColor={colors.textDim}
                style={styles.composerInput}
                returnKeyType="done"
                onSubmitEditing={submitDraft}
                blurOnSubmit={false}
              />
              <SoftPressable
                style={[styles.composerBtn, !draft.trim() && styles.composerBtnOff]}
                onPress={submitDraft}
                disabled={!draft.trim()}
              >
                <Text style={styles.composerBtnText}>{t('shopping.add')}</Text>
              </SoftPressable>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{open.length}</Text>
                <Text style={styles.statLabel}>{t('shopping.toBuy')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{bought.length}</Text>
                <Text style={styles.statLabel}>{t('shopping.bought')}</Text>
              </View>
            </View>
            {total > 0 && progress ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round((bought.length / total) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>{progress}</Text>
              </View>
            ) : null}
          </View>

          {shopping.length === 0 ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>{t('shopping.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('shopping.emptyText')}</Text>
            </View>
          ) : null}

          {open.length > 0 ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>
                {t('shopping.toBuy')} · {open.length}
              </Text>
              {open.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleShoppingBought(item.id)}
                  onPress={() => {
                    setCreating(false)
                    setEditing(item)
                  }}
                />
              ))}
            </View>
          ) : null}

          {bought.length > 0 ? (
            <View style={styles.panel}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>
                  {t('shopping.bought')} · {bought.length}
                </Text>
                <Pressable onPress={clearBoughtShopping} hitSlop={8}>
                  <Text style={styles.clearBought}>{t('shopping.clearBought')}</Text>
                </Pressable>
              </View>
              {bought.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleShoppingBought(item.id)}
                  onPress={() => {
                    setCreating(false)
                    setEditing(item)
                  }}
                />
              ))}
            </View>
          ) : null}

          {recent.length > 0 ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>{t('shopping.recent')}</Text>
              <View style={styles.chipWrap}>
                {recent.map((title) => (
                  <Pressable
                    key={title}
                    style={styles.chip}
                    onPress={() => addShoppingQuick({ title })}
                  >
                    <Text style={styles.chipText}>+ {title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{t('shopping.aisles')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.aisleRow}
            >
              {SHOPPING_AISLES.map((id) => {
                const on = aisle === id
                return (
                  <Pressable
                    key={id}
                    style={[styles.aisleChip, on && styles.aisleChipOn]}
                    onPress={() => setAisle(id)}
                  >
                    <Text style={[styles.aisleText, on && styles.aisleTextOn]}>
                      {t(aisleLabelKey(id))}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <View style={styles.chipWrap}>
              {seeds.map((seed) => {
                const label = t(seedLabelKey(seed.key))
                const onList = openTitles.has(label.toLowerCase())
                return (
                  <Pressable
                    key={seed.key}
                    style={[styles.chip, onList && styles.chipOnList]}
                    onPress={() =>
                      addShoppingQuick({
                        title: label,
                        amount: seed.amount ?? null,
                        unit: seed.unit ?? null,
                      })
                    }
                  >
                    <Text style={[styles.chipText, onList && styles.chipTextOnList]}>
                      {onList ? `✓ ${label}` : `+ ${label}`}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </ScrollView>

        <SoftPressable
          style={[styles.fab, { bottom: localFabBottom(insets.bottom), right: FAB_RIGHT, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 }]}
          onPress={() => {
            setCreating(true)
            setEditing(null)
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </SoftPressable>

        <ShoppingItemEditor
          visible={creating || !!editing}
          creating={creating}
          item={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={(patch) => {
            if (creating) {
              createShoppingLocal(patch)
              return
            }
            if (editing) {
              upsertShoppingItem({
                ...editing,
                ...patch,
                updated_at: new Date().toISOString(),
              })
            }
          }}
          onDelete={
            editing
              ? () => {
                  removeShoppingItem(editing.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Screen>
  )
}

function ShoppingRow({
  item,
  onToggle,
  onPress,
}: {
  item: ShoppingItem
  onToggle: () => void
  onPress: () => void
}) {
  const t = useT()
  const qty =
    item.amount != null && item.amount > 0
      ? `${Number.isInteger(item.amount) ? item.amount : Math.round(item.amount * 100) / 100} ${t(`shopping.unit.${item.unit || 'pcs'}`)}`
      : ''
  return (
    <View style={[styles.row, item.bought && styles.rowBought]}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        style={styles.checkWrap}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.bought }}
      >
        <View style={[styles.check, item.bought && styles.checkOn]}>
          {item.bought ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable onPress={onPress} style={styles.rowBody} accessibilityRole="button">
        <Text style={[styles.rowTitle, item.bought && styles.rowTitleBought]} numberOfLines={2}>
          {item.title}
        </Text>
        {qty ? <Text style={styles.rowMeta}>{qty}</Text> : null}
      </Pressable>
    </View>
  )
}

const panel = {
  backgroundColor: 'rgba(250,252,251,0.94)',
  borderRadius: radii.lg,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
} as const

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: FAB_SCROLL_INSET,
  },
  headerPanel: {
    ...panel,
    backgroundColor: colors.bgCardSolid,
    gap: 6,
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
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  composerBtn: {
    backgroundColor: colors.bgDeep,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  composerBtnOff: { opacity: 0.4 },
  composerBtnText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.textDim, fontFamily: fonts.body, fontSize: 11 },
  progressBlock: {
    marginTop: 12,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  progressLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  emptyPanel: { ...panel, gap: 6 },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  panel: { ...panel, gap: 8 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  clearBought: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13 },
  aisleRow: { gap: 8, paddingVertical: 2 },
  aisleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  aisleChipOn: {
    backgroundColor: colors.bgDeep,
    borderColor: colors.bgDeep,
  },
  aisleText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  aisleTextOn: { color: colors.textOnAccent },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.bgElevated,
  },
  chipOnList: {
    backgroundColor: 'rgba(15,42,50,0.06)',
    borderColor: 'transparent',
  },
  chipText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextOnList: { color: colors.textDim },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBought: { opacity: 0.55 },
  checkWrap: { paddingTop: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 12 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
  rowTitleBought: { textDecorationLine: 'line-through', color: colors.textMuted },
  rowMeta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 96, // overridden at runtime via localFabBottom
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
