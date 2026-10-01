import { Text, VStack } from '@expo/ui/swift-ui'
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

/**
 * Minimal home-screen widget (nearest task).
 * Deliberately Text-only — no Image/HStack/Spacer/symbolEffect — so a single
 * failing native view type cannot blank the whole card in release builds.
 */
export type WahrlyTodayProps = {
  label?: string
  time?: string
  title?: string
  subtitle?: string
  updatedAt?: string
  deepLink?: string
  taskId?: string
  openInWahrly?: string
  emptyHeadline?: string
  greeting?: string
  todayCount?: number
  nextTask?: string
  nextBill?: string
}

const INK = '#12252C'
const TEAL = '#0F6E66'
const MUTED = '#5A717A'
const BG = '#D8EBE6'

function WahrlyTodayWidget(props: WahrlyTodayProps, _env: WidgetEnvironment) {
  'widget'
  const label = String(props.label || props.greeting || 'WAHRLY').toUpperCase()
  const time = String(props.time || '')
  const emptyTitle = String(props.emptyHeadline || props.title || 'No upcoming tasks')
  const title = String(props.title || emptyTitle)
  const subtitle = String(props.subtitle || '')
  const link =
    props.deepLink ||
    (props.taskId
      ? `wahrly://tasks?taskId=${encodeURIComponent(String(props.taskId))}`
      : 'wahrly://tasks')

  return (
    <VStack
      spacing={6}
      alignment="leading"
      modifiers={[
        padding({ all: 14 }),
        containerBackground(BG, 'widget'),
        widgetURL(link),
      ]}
    >
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(TEAL)]}>
        {label}
      </Text>
      <Text
        modifiers={[
          font({ size: time ? 28 : 18, weight: 'bold', design: 'rounded' }),
          foregroundStyle(INK),
          lineLimit(2),
        ]}
      >
        {time || emptyTitle}
      </Text>
      {time ? (
        <Text
          modifiers={[
            font({ size: 14, weight: 'medium' }),
            foregroundStyle(INK),
            lineLimit(3),
          ]}
        >
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED), lineLimit(2)]}>
          {subtitle}
        </Text>
      ) : null}
    </VStack>
  )
}

const WahrlyToday = createWidget<WahrlyTodayProps>('WahrlyToday', WahrlyTodayWidget)

export default WahrlyToday
