import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Task } from '../types'
import { colors, fonts, spacing } from '../constants/theme'
import { fetchWeatherBrief, formatWeatherLine, type WeatherBrief } from '../lib/weather'

type Props = {
  tasks: Task[]
  workdayStart: string
  workdayEnd: string
  weatherCity?: string | null
  planning?: boolean
  onPlanDay: () => void | Promise<void>
  onDismiss: () => void
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
  planning,
  onPlanDay,
  onDismiss,
}: Props) {
  const [weather, setWeather] = useState<WeatherBrief | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setWeatherLoading(true)
    fetchWeatherBrief(weatherCity)
      .then((w) => {
        if (alive) setWeather(w)
      })
      .finally(() => {
        if (alive) setWeatherLoading(false)
      })
    return () => {
      alive = false
    }
  }, [weatherCity])

  const preview = tasks.slice(0, 4)

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Morning brief</Text>
          <Text style={styles.title}>Today’s plan</Text>
          <Text style={styles.meta}>
            {workdayStart}–{workdayEnd}
            {tasks.length ? ` · ${tasks.length} open` : ' · clear day'}
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10}>
          <Text style={styles.dismiss}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.weatherRow}>
        {weatherLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : weather ? (
          <Text style={styles.weather}>{formatWeatherLine(weather)}</Text>
        ) : (
          <Text style={styles.weatherMuted}>
            Set a city in Settings for weather — helps you plan outdoors.
          </Text>
        )}
      </View>

      {preview.length > 0 ? (
        <View style={styles.list}>
          {preview.map((t, i) => (
            <Text key={t.id} style={styles.item} numberOfLines={1}>
              {i + 1}. {t.title}
              {t.time ? ` · ${t.time}` : ''}
            </Text>
          ))}
          {tasks.length > preview.length ? (
            <Text style={styles.more}>+{tasks.length - preview.length} more on the signal</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.empty}>No open tasks yet — add one below, then Plan day.</Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.planBtn, planning && styles.planDisabled]}
          onPress={onPlanDay}
          disabled={!!planning}
        >
          <Text style={styles.planText}>{planning ? 'Planning…' : 'Plan day'}</Text>
        </Pressable>
        <Text style={styles.hint}>Packs untimed tasks into free gaps for today.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 4,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  dismiss: { color: colors.textMuted, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 4 },
  weatherRow: { minHeight: 22, justifyContent: 'center' },
  weather: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  weatherMuted: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  list: { gap: 4 },
  item: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  more: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  empty: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  actions: { gap: 6, marginTop: 2 },
  planBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDisabled: { opacity: 0.45 },
  planText: { color: colors.accentStrong, fontFamily: fonts.bodyBold, fontSize: 13 },
  hint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
})
