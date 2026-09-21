import { Text, VStack } from '@expo/ui/swift-ui'
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

export type WahrlyTodayProps = {
  greeting: string
  todayCount: number
  nextTask: string
  nextBill: string
  updatedAt: string
}

function WahrlyTodayWidget(props: WahrlyTodayProps, _env: WidgetEnvironment) {
  'widget'
  return (
    <VStack
      modifiers={[
        padding({ all: 14 }),
      ]}
    >
      <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle('#0F3D3E')]}>
        {props.greeting || 'Wahrly'}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#2A9B8E')]}>
        {props.todayCount
          ? `${props.todayCount} today`
          : 'Clear day'}
      </Text>
      <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle('#1A2B2B')]}>
        {props.nextTask || 'No tasks'}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#5A6B6B')]}>
        {props.nextBill || 'No bills due'}
      </Text>
    </VStack>
  )
}

const WahrlyToday = createWidget<WahrlyTodayProps>('WahrlyToday', WahrlyTodayWidget)

export default WahrlyToday
