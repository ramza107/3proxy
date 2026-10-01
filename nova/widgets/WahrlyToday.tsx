import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  symbolEffect,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

/**
 * Small home-screen widget: nearest upcoming task only.
 * Props are pushed from `lib/widgetSync.native.ts` via updateSnapshot.
 */
export type WahrlyTodayProps = {
  label: string
  time: string
  title: string
  subtitle: string
  updatedAt: string
  // Legacy fields (ignored if present from older app builds)
  greeting?: string
  todayCount?: number
  nextTask?: string
  nextBill?: string
}

const INK = '#12252C'
const TEAL = '#0F6E66'
const MUTED = '#5A717A'
const MIST = '#E8EEF1'
const MINT = '#D8EBE6'

function WahrlyTodayWidget(props: WahrlyTodayProps, env: WidgetEnvironment) {
  'widget'
  const label = (props.label || props.greeting || 'WAHRLY').toUpperCase()
  const time = props.time || ''
  const title =
    props.title ||
    (props.nextTask && !props.nextTask.includes('·')
      ? props.nextTask
      : props.nextTask?.split(' · ').slice(1).join(' · ')) ||
    'No upcoming tasks'
  const subtitle = props.subtitle || ''
  const empty = !time && (title === 'No upcoming tasks' || !props.title)
  const family = env.widgetFamily
  const compact = family === 'systemSmall' || family?.startsWith('accessory')

  const timeSize = compact ? 30 : 36
  const titleSize = compact ? 14 : 16

  return (
    <VStack
      spacing={compact ? 4 : 6}
      alignment="leading"
      modifiers={[
        padding({ all: compact ? 12 : 14 }),
        frame({ maxWidth: Number.POSITIVE_INFINITY, maxHeight: Number.POSITIVE_INFINITY, alignment: 'topLeading' }),
        containerBackground(
          {
            type: 'linearGradient',
            colors: [MINT, MIST, '#F5F8FA'],
            startPoint: { x: 0, y: 0 },
            endPoint: { x: 1, y: 1 },
          },
          'widget',
        ),
      ]}
    >
      <HStack spacing={6} alignment="center">
        <Image
          systemName={empty ? 'sparkles' : 'checkmark.circle.fill'}
          size={compact ? 13 : 14}
          color={TEAL}
          modifiers={[
            symbolEffect(
              { effect: 'breathe', style: 'pulse' },
              { options: { repeat: 'continuous', speed: 0.85 } },
            ),
          ]}
        />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(TEAL)]}>
          {label}
        </Text>
        <Spacer />
        {!empty && time ? (
          <Image
            systemName="clock"
            size={11}
            color={MUTED}
            modifiers={[
              symbolEffect(
                { effect: 'pulse' },
                { options: { repeat: 'continuous', speed: 0.6 } },
              ),
            ]}
          />
        ) : null}
      </HStack>

      {time ? (
        <Text
          modifiers={[
            font({ size: timeSize, weight: 'bold', design: 'rounded' }),
            foregroundStyle(INK),
          ]}
        >
          {time}
        </Text>
      ) : (
        <Text
          modifiers={[
            font({ size: compact ? 18 : 22, weight: 'bold', design: 'rounded' }),
            foregroundStyle(INK),
          ]}
        >
          {empty ? 'Clear' : 'Soon'}
        </Text>
      )}

      <Text
        modifiers={[
          font({ size: titleSize, weight: 'medium' }),
          foregroundStyle(INK),
          lineLimit(compact ? 2 : 3),
        ]}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          modifiers={[font({ size: 12 }), foregroundStyle(MUTED), lineLimit(2)]}
        >
          {subtitle}
        </Text>
      ) : null}

      {!compact && !empty ? (
        <HStack spacing={4} alignment="center" modifiers={[padding({ top: 4 })]}>
          <Image
            systemName="arrow.right.circle.fill"
            size={12}
            color={TEAL}
            modifiers={[
              symbolEffect(
                { effect: 'bounce', direction: 'up' },
                { options: { repeat: { count: 2, delay: 3 }, speed: 0.9 } },
              ),
            ]}
          />
          <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(TEAL)]}>
            Open in Wahrly
          </Text>
        </HStack>
      ) : null}
    </VStack>
  )
}

const WahrlyToday = createWidget<WahrlyTodayProps>('WahrlyToday', WahrlyTodayWidget)

export default WahrlyToday
