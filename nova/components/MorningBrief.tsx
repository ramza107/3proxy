import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { Task } from '../types'
import { colors, fonts, radii, spacing } from '../constants/theme'
import {
  fetchWeatherBrief,
  weatherAccent,
  weatherKind,
  weatherMood,
  weatherPalette,
  type WeatherBrief,
} from '../lib/weather'
import { SoftPressable } from './SoftPressable'
import { AnalyticsEvents, track } from '../lib/analytics'

type Props = {
  tasks: Task[]
  workdayStart: string
  workdayEnd: string
  weatherCity?: string | null
  weatherLat?: number | null
  weatherLon?: number | null
  planning?: boolean
  onPlanDay: () => void | Promise<void>
  onDismiss: () => void
  /** When true, skip outer chrome (used inside BottomSheet) */
  embedded?: boolean
}

function WeatherArt({ code }: { code: number }) {
  const kind = weatherKind(code)
  const accent = weatherAccent(code)
  const breathe = useSharedValue(1)
  const drift = useSharedValue(0)
  const rain = useSharedValue(0)

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
    drift.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
        withTiming(-4, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
    if (kind === 'rain' || kind === 'storm' || kind === 'snow') {
      rain.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.linear }),
          withTiming(0.25, { duration: 900, easing: Easing.linear }),
        ),
        -1,
        false,
      )
    }
  }, [kind, breathe, drift, rain])

  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }))
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value }],
  }))
  const precipStyle = useAnimatedStyle(() => ({
    opacity: rain.value,
  }))

  return (
    <View style={art.stage} pointerEvents="none">
      {(kind === 'clear' || kind === 'cloud' || kind === 'mixed') && (
        <Animated.View
          style={[
            art.sun,
            { backgroundColor: kind === 'clear' ? accent : `${accent}99` },
            sunStyle,
          ]}
        />
      )}
      {(kind === 'cloud' || kind === 'fog' || kind === 'rain' || kind === 'snow' || kind === 'storm') && (
        <Animated.View style={[art.cloudWrap, cloudStyle]}>
          <View style={[art.cloud, art.cloudA, kind === 'fog' && art.cloudFog]} />
          <View style={[art.cloud, art.cloudB, kind === 'fog' && art.cloudFog]} />
        </Animated.View>
      )}
      {(kind === 'rain' || kind === 'storm') && (
        <Animated.View style={[art.precip, precipStyle]}>
          <View style={[art.drop, { left: 18 }]} />
          <View style={[art.drop, { left: 34, height: 12 }]} />
          <View style={[art.drop, { left: 50 }]} />
          <View style={[art.drop, { left: 66, height: 10 }]} />
        </Animated.View>
      )}
      {kind === 'snow' && (
        <Animated.View style={[art.precip, precipStyle]}>
          <View style={[art.flake, { left: 20 }]} />
          <View style={[art.flake, { left: 40, top: 8 }]} />
          <View style={[art.flake, { left: 58 }]} />
        </Animated.View>
      )}
      {kind === 'storm' && <Animated.View style={[art.bolt, precipStyle]} />}
    </View>
  )
}

const art = StyleSheet.create({
  stage: {
    width: 88,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sun: {
    width: 42,
    height: 42,
    borderRadius: 21,
    position: 'absolute',
    top: 8,
    right: 10,
    shadowColor: '#D4A017',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  cloudWrap: {
    width: 78,
    height: 40,
    position: 'absolute',
    bottom: 14,
    left: 4,
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
  },
  cloudA: { width: 54, height: 28, left: 0, bottom: 0 },
  cloudB: { width: 42, height: 24, right: 0, bottom: 4 },
  cloudFog: { backgroundColor: 'rgba(255,255,255,0.55)' },
  precip: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: 22,
  },
  drop: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: 'rgba(61,111,138,0.55)',
  },
  flake: {
    position: 'absolute',
    top: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  bolt: {
    position: 'absolute',
    top: 28,
    left: 40,
    width: 8,
    height: 18,
    backgroundColor: '#F0D060',
    transform: [{ rotate: '18deg' }],
    borderRadius: 1,
  },
})

function StatChip({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(380)} style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </Animated.View>
  )
}

/**
 * First-open morning strip: weather + today's open tasks + Plan day.
 * Shown once per day until dismissed / planned.
 */
export function MorningBrief({
  tasks,
  workdayStart,
  workdayEnd,
  weatherCity,
  weatherLat,
  weatherLon,
  planning,
  onPlanDay,
  onDismiss,
  embedded,
}: Props) {
  const [weather, setWeather] = useState<WeatherBrief | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  useEffect(() => {
    void track(AnalyticsEvents.morningBriefShown)
  }, [])

  useEffect(() => {
    let alive = true
    setWeatherLoading(true)
    const coords =
      weatherLat != null && weatherLon != null ? { lat: weatherLat, lon: weatherLon } : null
    fetchWeatherBrief(weatherCity, coords)
      .then((w) => {
        if (alive) setWeather(w)
      })
      .finally(() => {
        if (alive) setWeatherLoading(false)
      })
    return () => {
      alive = false
    }
  }, [weatherCity, weatherLat, weatherLon])

  const preview = tasks.slice(0, 4)
  const palette = weatherPalette(weather?.code)
  const greeting =
    new Date().getHours() < 11 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const body = (
    <>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          {!embedded ? <Text style={styles.kicker}>Morning brief</Text> : null}
          <Text style={styles.title}>{greeting}</Text>
          <Text style={styles.meta}>
            {workdayStart}–{workdayEnd}
            {tasks.length ? ` · ${tasks.length} open` : ' · clear day'}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Text style={styles.dismiss}>Done</Text>
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.delay(80).duration(480).springify().damping(17)}>
        <LinearGradient
          colors={palette}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weatherCard}
        >
          {weatherLoading ? (
            <View style={styles.weatherLoading}>
              <ActivityIndicator color={colors.accentStrong} />
              <Text style={styles.weatherLoadingText}>Reading the sky…</Text>
            </View>
          ) : weather ? (
            <>
              <View style={styles.weatherTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.weatherPlace} numberOfLines={1}>
                    {weather.place}
                  </Text>
                  <View style={styles.tempRow}>
                    <Animated.Text
                      entering={FadeInRight.delay(140).duration(420)}
                      style={styles.weatherTemp}
                    >
                      {weather.tempC}°
                    </Animated.Text>
                    <View style={styles.tempMeta}>
                      <Text style={styles.weatherLabel}>{weather.label}</Text>
                      <Text style={styles.hiLo}>
                        H {weather.highC}° · L {weather.lowC}°
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.weatherMood}>{weatherMood(weather.code)}</Text>
                </View>
                <WeatherArt code={weather.code} />
              </View>

              <View style={styles.stats}>
                <StatChip label="Feels" value={`${weather.feelsC}°`} delay={220} />
                {weather.humidity != null ? (
                  <StatChip label="Humidity" value={`${weather.humidity}%`} delay={280} />
                ) : null}
                {weather.windKmh != null ? (
                  <StatChip label="Wind" value={`${weather.windKmh} km/h`} delay={340} />
                ) : null}
                {weather.precipChance != null ? (
                  <StatChip label="Rain" value={`${weather.precipChance}%`} delay={400} />
                ) : null}
              </View>
            </>
          ) : (
            <Text style={styles.weatherMuted}>
              Set a city in Settings for weather — helps you plan outdoors.
            </Text>
          )}
        </LinearGradient>
      </Animated.View>

      {preview.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listHead}>Today</Text>
          {preview.map((t, i) => (
            <Animated.View
              key={t.id}
              entering={FadeInDown.delay(200 + i * 55).duration(320)}
              style={styles.itemRow}
            >
              <View style={styles.itemDot} />
              <Text style={styles.item} numberOfLines={1}>
                {t.title}
                {t.time ? ` · ${t.time}` : ''}
              </Text>
            </Animated.View>
          ))}
          {tasks.length > preview.length ? (
            <Text style={styles.more}>+{tasks.length - preview.length} more on the signal</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.empty}>No open tasks yet — add one below, then Plan day.</Text>
      )}

      <View style={styles.actions}>
        <SoftPressable
          style={[styles.planBtn, planning && styles.planDisabled]}
          onPress={() => {
            if (!planning) void onPlanDay()
          }}
          disabled={!!planning}
          hitSlop={12}
        >
          <Text style={styles.planText}>{planning ? 'Arranging…' : 'Plan day'}</Text>
        </SoftPressable>
        <Text style={styles.hint}>Weather and today’s list — arrange when you’re ready.</Text>
      </View>
    </>
  )

  if (embedded) {
    return <View style={styles.embedded}>{body}</View>
  }

  return (
    <Animated.View entering={FadeInDown.duration(420).springify().damping(18)} style={styles.wrap}>
      {body}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 4,
  },
  embedded: { gap: 14, paddingBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 26,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  dismiss: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 6 },
  weatherCard: {
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,42,50,0.08)',
  },
  weatherLoading: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  weatherLoadingText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  weatherTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  weatherPlace: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  weatherTemp: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1.5,
  },
  tempMeta: { paddingBottom: 8, gap: 2 },
  weatherLabel: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  hiLo: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  weatherMood: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 220,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 72,
  },
  chipLabel: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chipValue: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 1,
  },
  weatherMuted: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
  list: { gap: 6 },
  listHead: {
    color: colors.textDim,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  item: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  more: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 2, marginLeft: 14 },
  empty: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  actions: { gap: 6, marginTop: 2 },
  planBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDisabled: { opacity: 0.45 },
  planText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 14 },
  hint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
})
