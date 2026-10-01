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
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { BrandMark } from '../../components/BrandMark'
import { Screen } from '../../components/Screen'
import { SoftPressable } from '../../components/SoftPressable'
import { brand, colors, fonts, radii, spacing } from '../../constants/theme'
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
  const target = (url || '').trim()
  if (!target || !/^https?:\/\//i.test(target)) return
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(target, '_blank', 'noopener,noreferrer')
    return
  }
  Linking.openURL(target).catch(() => undefined)
}

function formatStoryTime(iso: string, language: string) {
  try {
    return new Date(iso).toLocaleTimeString(language, {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
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

  const lead = sections[0]?.items[0] || null
  const leadInterest = sections[0]?.interest || null

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
          <Animated.View entering={FadeIn.duration(480)} style={styles.heroBleed}>
            <LinearGradient
              colors={['#071F24', '#0A3D3A', '#0F6E66']}
              locations={[0, 0.45, 1]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroWash} />
              <View style={styles.heroOrbA} />
              <View style={styles.heroOrbB} />
              <View style={styles.heroOrbC} />

              <View style={styles.heroTop}>
                <View style={styles.brandRow}>
                  <BrandMark size={22} color="rgba(247,251,250,0.92)" />
                  <Text style={styles.brandWord}>{brand.name}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => load(true)}
                  hitSlop={12}
                  style={styles.refreshBtn}
                >
                  <Text style={styles.refreshText}>
                    {loading ? '···' : t('home.refresh')}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.heroKicker}>{t('news.kicker')}</Text>
              <Text style={styles.heroTitle}>{t('news.title')}</Text>
              <Text style={styles.heroSub}>{t('news.sub')}</Text>
              {digest?.dayLabel ? (
                <View style={styles.dayPill}>
                  <View style={styles.dayDot} />
                  <Text style={styles.heroDay}>{digest.dayLabel}</Text>
                </View>
              ) : null}
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(70).duration(400)} style={styles.topics}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topicRow}
            >
              {NEWS_INTERESTS.map((key) => {
                const on = interests.includes(key)
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggleInterest(key)}
                    style={styles.topic}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.topicText, on && styles.topicTextOn]}>
                      {t(INTEREST_KEYS[key])}
                    </Text>
                    <View style={[styles.topicRule, on && styles.topicRuleOn]} />
                  </Pressable>
                )
              })}
            </ScrollView>
          </Animated.View>

          {loading && !digest ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 36 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !sections.length ? (
            <Animated.View entering={FadeInDown.delay(100).duration(380)} style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('news.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('news.emptyText')}</Text>
            </Animated.View>
          ) : (
            <>
              {lead && leadInterest ? (
                <Animated.View entering={FadeInDown.delay(110).duration(450)}>
                  <SoftPressable
                    stretch
                    onPress={() => openExternal(lead.url)}
                    style={styles.lead}
                  >
                    <View style={styles.leadRow}>
                      <View style={styles.leadAccent} />
                      <View style={styles.leadBody}>
                        <Text style={styles.leadMeta}>
                          {t(INTEREST_KEYS[leadInterest])}
                          <Text style={styles.leadMetaSep}>  ·  </Text>
                          {lead.source}
                        </Text>
                        <Text style={styles.leadTitle}>{lead.title}</Text>
                        <View style={styles.leadFoot}>
                          <Text style={styles.leadTime}>
                            {formatStoryTime(lead.publishedAt, t.language)}
                          </Text>
                          <Text style={styles.leadCta}>{t('news.open')}</Text>
                        </View>
                      </View>
                    </View>
                  </SoftPressable>
                </Animated.View>
              ) : null}

              {sections.map((section, sIdx) => {
                const rest =
                  sIdx === 0 && lead
                    ? section.items.filter((i) => i.id !== lead.id)
                    : section.items
                if (!rest.length) return null
                return (
                  <Animated.View
                    key={section.interest}
                    entering={FadeInDown.delay(160 + sIdx * 75).duration(400)}
                    style={styles.section}
                  >
                    <View style={styles.sectionHead}>
                      <Text style={styles.sectionTitle}>
                        {t(INTEREST_KEYS[section.interest])}
                      </Text>
                      <Text style={styles.sectionCount}>
                        {t.tf('news.sectionCount', { n: section.items.length })}
                      </Text>
                    </View>

                    <View style={styles.rail}>
                      {rest.map((item, index) => {
                        const last = index === rest.length - 1
                        return (
                          <SoftPressable
                            key={`${item.id}_${index}`}
                            stretch
                            onPress={() => openExternal(item.url)}
                            style={styles.story}
                          >
                            <View style={styles.storyRow}>
                              <View style={styles.storyTrack}>
                                <View style={styles.storyDot} />
                                {!last ? <View style={styles.storyLine} /> : null}
                              </View>
                              <View style={[styles.storyMain, last && styles.storyMainLast]}>
                                <View style={styles.storyTop}>
                                  <Text style={styles.storySource}>{item.source}</Text>
                                  <Text style={styles.storyTime}>
                                    {formatStoryTime(item.publishedAt, t.language)}
                                  </Text>
                                </View>
                                <Text style={styles.storyTitle} numberOfLines={3}>
                                  {item.title}
                                </Text>
                              </View>
                            </View>
                          </SoftPressable>
                        )
                      })}
                    </View>
                  </Animated.View>
                )
              })}
            </>
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
    paddingBottom: 140,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 560 : undefined,
    alignSelf: 'center',
    gap: 0,
  },
  heroBleed: {
    marginHorizontal: 0,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 4,
    minHeight: 220,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    gap: 6,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232,238,241,0.04)',
  },
  heroOrbA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(247,251,250,0.08)',
    top: -70,
    right: -50,
  },
  heroOrbB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(15,110,102,0.45)',
    bottom: -40,
    left: -30,
  },
  heroOrbC: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(247,251,250,0.05)',
    top: 48,
    left: '42%',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandWord: {
    color: 'rgba(247,251,250,0.92)',
    fontFamily: fonts.brand,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: 'rgba(247,251,250,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(247,251,250,0.18)',
  },
  refreshText: {
    color: colors.textOnAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  heroKicker: {
    color: 'rgba(247,251,250,0.62)',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.textOnAccent,
    fontFamily: fonts.brand,
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1.2,
    marginTop: 2,
  },
  heroSub: {
    color: 'rgba(247,251,250,0.78)',
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
    marginTop: 2,
  },
  dayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(247,251,250,0.55)',
  },
  heroDay: {
    color: 'rgba(247,251,250,0.68)',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  topics: {
    paddingTop: spacing.md,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(245,248,250,0.55)',
  },
  topicRow: {
    paddingHorizontal: spacing.lg,
    gap: 22,
  },
  topic: {
    paddingVertical: 8,
    gap: 7,
  },
  topicText: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  topicTextOn: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
  topicRule: {
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  topicRuleOn: {
    backgroundColor: colors.accent,
  },
  lead: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  leadRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  leadAccent: {
    width: 3,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 4,
    marginBottom: 4,
  },
  leadBody: {
    flex: 1,
    gap: 12,
    paddingBottom: 4,
  },
  leadMeta: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  leadMetaSep: {
    color: colors.textDim,
    letterSpacing: 0,
  },
  leadTitle: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.7,
  },
  leadFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  leadTime: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  leadCta: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  sectionCount: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  rail: {
    gap: 0,
  },
  story: {
    width: '100%',
  },
  storyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    width: '100%',
  },
  storyTrack: {
    width: 14,
    alignItems: 'center',
  },
  storyDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: colors.signal,
    marginTop: 8,
    borderWidth: 2,
    borderColor: 'rgba(15,110,102,0.18)',
  },
  storyLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.signalLine,
    marginTop: 5,
    marginBottom: -2,
  },
  storyMain: {
    flex: 1,
    gap: 5,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  storyMainLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  storyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  storySource: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  storyTime: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  storyTitle: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16.5,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  empty: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  emptyText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  demoNote: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
})
