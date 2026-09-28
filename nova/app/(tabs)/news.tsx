import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HomeSection } from '../../components/HomeSection'
import { Screen } from '../../components/Screen'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { fetchYesterdayNews } from '../../lib/newsApi'
import { useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'
import {
  NEWS_INTERESTS,
  normalizeNewsInterests,
  type NewsInterest,
  type NewsItem,
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

function openExternal(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  Linking.openURL(url).catch(() => undefined)
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
    // t() identity changes every render — depend on language only
    [interests, t.language],
  )

  useFocusEffect(
    useCallback(() => {
      load(false).catch(() => undefined)
    }, [load]),
  )

  const sections = useMemo(() => {
    if (!digest?.items.length) return [] as { interest: NewsInterest; items: NewsItem[] }[]
    const order = digest.interests.length ? digest.interests : interests
    return order
      .map((interest) => ({
        interest,
        items: digest.items.filter((i) => i.interest === interest),
      }))
      .filter((s) => s.items.length > 0)
  }, [digest, interests])

  const toggleInterest = (key: NewsInterest) => {
    const has = interests.includes(key)
    let next: NewsInterest[]
    if (has) {
      next = interests.filter((x) => x !== key)
      if (next.length === 0) next = [key]
    } else {
      next = [...interests, key]
    }
    updateSettings({ newsInterests: normalizeNewsInterests(next) })
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>{t('news.kicker')}</Text>
            <Text style={styles.title}>{t('news.title')}</Text>
            <Text style={styles.sub}>{t('news.sub')}</Text>
          </View>

          <HomeSection
            title={t('news.interests')}
            meta={t('news.interestsMeta')}
            action={
              <Pressable accessibilityRole="button" onPress={() => load(true)} hitSlop={8}>
                <Text style={styles.refresh}>{loading ? '…' : t('home.refresh')}</Text>
              </Pressable>
            }
          >
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
          </HomeSection>

          {loading && !digest ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !sections.length ? (
            <HomeSection title={t('news.emptyTitle')}>
              <Text style={styles.emptyText}>{t('news.emptyText')}</Text>
            </HomeSection>
          ) : (
            sections.map((section) => (
              <HomeSection
                key={section.interest}
                title={t(INTEREST_KEYS[section.interest])}
                meta={t.tf('news.sectionCount', { n: section.items.length })}
              >
                {section.items.map((item, index) => (
                  <Pressable
                    key={`${item.id}_${index}`}
                    accessibilityRole="link"
                    style={[styles.row, index === 0 && styles.rowFirst]}
                    onPress={() => openExternal(item.url)}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowSource} numberOfLines={1}>
                        {item.source}
                      </Text>
                      <Text style={styles.rowTitle} numberOfLines={3}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.rowOpen}>{t('news.open')}</Text>
                  </Pressable>
                ))}
              </HomeSection>
            ))
          )}

          {digest?.demo ? <Text style={styles.demoNote}>{t('news.demoNote')}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 140,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : undefined,
    alignSelf: 'center',
  },
  header: { gap: 6, marginBottom: 4 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextOn: { color: colors.accentStrong },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meta: { flex: 1, color: colors.textDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  refresh: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowFirst: {
    borderTopWidth: 0,
    paddingTop: 2,
  },
  rowText: { flex: 1, gap: 3 },
  rowSource: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowTitle: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  rowOpen: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    marginTop: 2,
  },
  emptyText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontFamily: fonts.body, marginTop: 4 },
  demoNote: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
})
