import { Text, VStack } from '@expo/ui/swift-ui'
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers'
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

function WahrlyTodayWidget(props: WahrlyTodayProps, _env: WidgetEnvironment) {
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

  return (
    <VStack modifiers={[padding({ all: 14 })]}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#0F6E66')]}>
        {label}
      </Text>
      {time ? (
        <Text modifiers={[font({ size: 28, weight: 'bold' }), foregroundStyle('#12252C')]}>
          {time}
        </Text>
      ) : null}
      <Text modifiers={[font({ size: 15, weight: 'medium' }), foregroundStyle('#12252C')]}>
        {title}
      </Text>
      {subtitle ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#5A717A')]}>{subtitle}</Text>
      ) : null}
    </VStack>
  )
}

const WahrlyToday = createWidget<WahrlyTodayProps>('WahrlyToday', WahrlyTodayWidget)

export default WahrlyToday
