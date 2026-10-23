import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../../components/Screen'
import { ShoppingItemEditor } from '../../components/ShoppingItemEditor'
import { SoftPressable } from '../../components/SoftPressable'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import type { ShoppingItem } from '../../types'

export default function ShoppingScreen() {
  const t = useT()
  const shopping = useNovaStore((s) => s.shopping)
  const createShoppingLocal = useNovaStore((s) => s.createShoppingLocal)
  const upsertShoppingItem = useNovaStore((s) => s.upsertShoppingItem)
  const removeShoppingItem = useNovaStore((s) => s.removeShoppingItem)
  const toggleShoppingBought = useNovaStore((s) => s.toggleShoppingBought)
  const clearBoughtShopping = useNovaStore((s) => s.clearBoughtShopping)

  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [creating, setCreating] = useState(false)

  const open = useMemo(
    () => shopping.filter((i) => !i.bought).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [shopping],
  )
  const bought = useMemo(
    () => shopping.filter((i) => i.bought).sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || '')),
    [shopping],
  )

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{t('shopping.kicker')}</Text>
          <Text style={styles.title}>{t('shopping.title')}</Text>
          <Text style={styles.sub}>{t('shopping.sub')}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{open.length}</Text>
            <Text style={styles.statLabel}>{t('shopping.toBuy')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{bought.length}</Text>
            <Text style={styles.statLabel}>{t('shopping.bought')}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {shopping.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('shopping.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('shopping.emptyText')}</Text>
              <View style={styles.tplRow}>
                {(['milk', 'bread', 'eggs', 'coffee'] as const).map((key) => {
                  const seed = t(`shopping.seed.${key}`)
                  return (
                    <Pressable
                      key={key}
                      style={styles.tplChip}
                      onPress={() => createShoppingLocal({ title: seed, amount: 1, unit: 'pcs' })}
                    >
                      <Text style={styles.tplText}>+ {seed}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ) : null}

          {open.length > 0 ? (
            <View style={styles.section}>
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
            <View style={styles.section}>
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statValue: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.textDim, fontFamily: fonts.body, fontSize: 11 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    paddingBottom: 140,
  },
  empty: { gap: 8, paddingVertical: spacing.md },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, lineHeight: 20 },
  tplRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tplChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tplText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13 },
  section: { gap: 0 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  clearBought: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 13 },
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
