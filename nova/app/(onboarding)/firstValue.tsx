import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Screen } from '../../components/Screen'
import { colors, fonts, radii, spacing } from '../../constants/theme'
import { AnalyticsEvents, track } from '../../lib/analytics'
import { todayISO, useNovaStore } from '../../lib/store'
import { useT } from '../../lib/useT'

type Step = 'task' | 'loop' | 'plan'

/**
 * ~60s value path after typical week:
 * 1) create a first task → 2) add one open loop → 3) hint Plan day → ready.
 */
export default function FirstValueScreen() {
  const t = useT()
  const router = useRouter()
  const userId = useNovaStore((s) => s.sessionUserId)
  const createTaskLocal = useNovaStore((s) => s.createTaskLocal)
  const updateSettings = useNovaStore((s) => s.updateSettings)
  const [step, setStep] = useState<Step>('task')
  const [taskTitle, setTaskTitle] = useState('')
  const [loopTitle, setLoopTitle] = useState('')
  const [loopWho, setLoopWho] = useState('')

  const uid = userId || 'local'
  const today = todayISO()
  const stepIndex = step === 'task' ? 0 : step === 'loop' ? 1 : 2

  const placeholders = useMemo(
    () => ({
      task: t('onboarding.valueTaskPh'),
      loop: t('onboarding.valueLoopPh'),
      who: t('home.loopWhoPlaceholder'),
    }),
    [t],
  )

  const saveTask = () => {
    const title = taskTitle.trim() || t('onboarding.valueTaskDefault')
    createTaskLocal({
      title,
      date: today,
      priority: 'medium',
      userId: uid,
    })
    setStep('loop')
  }

  const saveLoop = () => {
    const title = loopTitle.trim()
    if (title) {
      const who = loopWho.trim()
      const labeled = who ? `${title} → ${who}` : title
      createTaskLocal({
        title: labeled,
        priority: 'high',
        userId: uid,
        sourceKind: 'promise',
        sourceId: `loop_onboard_${Date.now().toString(36)}`,
      })
    }
    setStep('plan')
  }

  const finish = (openHome: boolean) => {
    updateSettings({ onboardingComplete: true })
    void track(AnalyticsEvents.onboardingComplete)
    router.replace(openHome ? '/home' : '/ready')
  }

  return (
    <Screen>
      <View style={styles.screen}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= stepIndex && styles.dotOn]} />
          ))}
        </View>

        {step === 'task' ? (
          <>
            <Text style={styles.kicker}>{t('onboarding.valueKicker')}</Text>
            <Text style={styles.title}>{t('onboarding.valueTaskTitle')}</Text>
            <Text style={styles.body}>{t('onboarding.valueTaskSub')}</Text>
            <TextInput
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder={placeholders.task}
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoFocus
              onSubmitEditing={saveTask}
              returnKeyType="done"
            />
            <Pressable style={styles.btn} onPress={saveTask}>
              <Text style={styles.btnText}>{t('onboarding.valueAddTask')}</Text>
            </Pressable>
            <Pressable onPress={() => setStep('loop')} hitSlop={8}>
              <Text style={styles.skip}>{t('onboarding.weekSkip')}</Text>
            </Pressable>
          </>
        ) : null}

        {step === 'loop' ? (
          <>
            <Text style={styles.kicker}>{t('onboarding.valueKicker')}</Text>
            <Text style={styles.title}>{t('onboarding.valueLoopTitle')}</Text>
            <Text style={styles.body}>{t('onboarding.valueLoopSub')}</Text>
            <TextInput
              value={loopTitle}
              onChangeText={setLoopTitle}
              placeholder={placeholders.loop}
              placeholderTextColor={colors.textDim}
              style={styles.input}
              autoFocus
            />
            <TextInput
              value={loopWho}
              onChangeText={setLoopWho}
              placeholder={placeholders.who}
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
            <Pressable style={styles.btn} onPress={saveLoop}>
              <Text style={styles.btnText}>
                {loopTitle.trim() ? t('home.addLoop') : t('common.continue')}
              </Text>
            </Pressable>
            <Pressable onPress={() => setStep('plan')} hitSlop={8}>
              <Text style={styles.skip}>{t('onboarding.weekSkip')}</Text>
            </Pressable>
          </>
        ) : null}

        {step === 'plan' ? (
          <>
            <Text style={styles.kicker}>{t('onboarding.valueKicker')}</Text>
            <Text style={styles.title}>{t('onboarding.valuePlanTitle')}</Text>
            <Text style={styles.body}>{t('onboarding.valueHomeSub')}</Text>
            <Pressable style={styles.btn} onPress={() => finish(true)}>
              <Text style={styles.btnText}>{t('onboarding.valueHomeCta')}</Text>
            </Pressable>
            <Pressable onPress={() => finish(false)} hitSlop={8}>
              <Text style={styles.skip}>{t('onboarding.valuePlanSkip')}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  dotOn: { backgroundColor: colors.accent },
  kicker: {
    color: colors.accentStrong,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: fonts.brand,
    letterSpacing: -0.6,
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontFamily: fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 17 },
  skip: {
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
})
