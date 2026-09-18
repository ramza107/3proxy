import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'
import { todayISO, useNovaStore } from '../lib/store'

type Props = {
  enabled: boolean
}

/** Super-simple morning “who wrote” — just type names, no Gmail setup. */
export function WhoWroteBrief({ enabled }: Props) {
  const note = useNovaStore((s) => s.morningWhoWrote)
  const setMorningWhoWrote = useNovaStore((s) => s.setMorningWhoWrote)
  const today = todayISO()
  const savedToday = note?.date === today ? note : null
  const [draft, setDraft] = useState(savedToday?.raw || '')

  useEffect(() => {
    setDraft(savedToday?.raw || '')
  }, [savedToday?.raw])

  if (!enabled) return null

  const save = () => {
    const raw = draft.trim()
    if (!raw) {
      setMorningWhoWrote(null)
      return
    }
    const people = raw
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    setMorningWhoWrote({
      date: today,
      raw,
      people,
      summary:
        people.length <= 1
          ? `Overnight: ${people[0] || raw}.`
          : `Overnight: ${people.slice(0, -1).join(', ')}, and ${people[people.length - 1]}.`,
    })
  }

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Who wrote</Text>
      {savedToday ? (
        <>
          <Text style={styles.summary}>{savedToday.summary}</Text>
          <View style={styles.list}>
            {savedToday.people.slice(0, 6).map((p) => (
              <Text key={p} style={styles.person}>
                · {p}
              </Text>
            ))}
          </View>
          <Pressable onPress={() => setDraft(savedToday.raw)} hitSlop={8}>
            <Text style={styles.edit}>Edit</Text>
          </Pressable>
        </>
      ) : null}

      {(!savedToday || draft !== savedToday.raw) && (
        <>
          <Text style={styles.hint}>Type names — Mom, Alex, Amazon…</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Mom, boss about Q3, Amazon"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.btn} onPress={save}>
            <Text style={styles.btnText}>Save for today</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hint: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  summary: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  list: { gap: 2 },
  person: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  edit: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 13 },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
})
