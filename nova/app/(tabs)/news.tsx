import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Screen } from '../../components/Screen'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { fetchYesterdayNews } from '../../lib/newsApi'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import {
  NEWS_INTERESTS,
  normalizeNewsInterests,
  type NewsInterest,
  type YesterdayNewsDigest,
} from '../../types'

const INTEREST_KEYS: Record<NewsInterest, string> = {
  world: 'news.interestWorld',
  tech: 'news.interestTech',
  business: 'news.interestBusiness',
  science: 'news.interestScience',
  sports: 'news.interestSports',
  culture: 'news.interestCulture',
  health: 'news.interestHealth',
}

export default function NewsScreen() {
  const t = useT()
  const settings = useNovaStore((s) => s.settings)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const interests = useMemo(
    () => normalizeNewsInterests(settings.newsInterests),
    [settings.newsInterests],
  )

  const [digest, setDigest] = useState<YesterdayNewsDigest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchYesterdayNews({
          interests,
          language: t.language,
          refresh,
        })
        setDigest(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('news.loadError'))
      } finally {
        setLoading(false)
      }
    },
    [interests, t],
  )

  useFocusEffect(
    useCallback(() => {
      load(false).catch(() => undefined)
    }, [load]),
  )

  const toggleInterest = (key: NewsInterest) => {
    const has = interests.includes(key)
    let next: NewsInterest[]
    if (has) {
      next = interests.filter((x) => x !== key)
      if (next.length === 0) next = [key] // keep at least one
    } else {
      next = [...interests, key]
    }
    updateSettings({ newsInterests: normalizeNewsInterests(next) })
  }

  const openItem = (url: string) => {
    Linking.openURL(url).catch(() => undefined)
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{t('news.kicker')}</Text>
          <Text style={styles.title}>{t('news.title')}</Text>
          <Text style={styles.sub}>{t('news.sub')}</Text>
        </View>

        <Text style={styles.label}>{t('news.interests')}</Text>
        <View style={styles.chips}>
          {NEWS_INTERESTS.map((key) => {
            const on = interests.includes(key)
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggleInterest(key)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {t(INTEREST_KEYS[key])}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={2}>
            {digest
              ? digest.summary
              : loading
                ? t('news.loading')
                : t('news.pickInterests')}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => load(true)} hitSlop={8}>
            <Text style={styles.refresh}>{loading ? '…' : t('home.refresh')}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {loading && !digest ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !digest?.items.length ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('news.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('news.emptyText')}</Text>
            </View>
          ) : (
            digest.items.map((item, index) => (
              <Pressable
                key={`${item.id}_${index}`}
                accessibilityRole="link"
                style={styles.item}
                onPress={() => openItem(item.url)}
              >
                <View style={styles.itemTop}>
                  <Text style={styles.itemInterest}>{t(INTEREST_KEYS[item.interest])}</Text>
                  <Text style={styles.itemSource} numberOfLines={1}>
                    {item.source}
                  </Text>
                </View>
                <Text style={styles.itemTitle}>{item.title}</Text>
              </Pressable>
            ))
          )}
          {digest?.demo ? <Text style={styles.demoNote}>{t('news.demoNote')}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 6,
  },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  sub: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextOn: { color: colors.accentStrong },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  meta: { flex: 1, color: colors.textDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: 10,
  },
  item: {
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemInterest: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  itemSource: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, flexShrink: 1 },
  itemTitle: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  empty: { paddingVertical: spacing.xl, gap: 8 },
  emptyTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 17 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontFamily: fonts.body, marginTop: 12 },
  demoNote: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },
})
