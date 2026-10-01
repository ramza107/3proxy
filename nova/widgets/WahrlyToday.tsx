import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui'
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
 * Small home-screen widget: nearest upcoming task only.
 * Props are pushed from `lib/widgetSync.native.ts` via updateSnapshot.
 *
 * Keep this layout boring and defensive: any throw in the widget JS runtime
 * paints a blank card on device (release). Avoid symbolEffect (iOS 18+ only
 * for continuous/periodic) and Infinity frame sizes.
 */
export type WahrlyTodayProps = {
  label: string
  time: string
  title: string
  subtitle: string
  updatedAt: string
  deepLink?: string
  taskId?: string
  openInWahrly?: string
  emptyHeadline?: string
  // Legacy fields (ignored if present from older app builds)
  greeting?: string
  todayCount?: number
  nextTask?: string
  nextBill?: string
}

const INK = '#12252C'
const TEAL = '#0F6E66'
const MUTED = '#5A717A'
const BG = '#E6F2EF'

function WahrlyTodayWidget(props: WahrlyTodayProps, env: WidgetEnvironment) {
  'widget'
  const label = String(props.label || props.greeting || 'WAHRLY').toUpperCase()
  const time = String(props.time || '')
  const emptyTitle = String(props.emptyHeadline || 'Clear')
  const openLabel = String(props.openInWahrly || 'Open in Wahrly')
  const legacyTitle =
    props.nextTask && !String(props.nextTask).includes('·')
      ? String(props.nextTask)
      : String(props.nextTask || '')
          .split(' · ')
          .slice(1)
          .join(' · ')
  const title = String(props.title || legacyTitle || emptyTitle)
  const subtitle = String(props.subtitle || '')
  const empty =
    !time && !props.taskId && (!props.title || props.title === emptyTitle)
  const family = env?.widgetFamily || 'systemSmall'
  const compact = family === 'systemSmall' || String(family).startsWith('accessory')
  const link =
    props.deepLink ||
    (props.taskId
      ? `wahrly://tasks?taskId=${encodeURIComponent(String(props.taskId))}`
      : 'wahrly://tasks')

  const timeSize = compact ? 28 : 34
  const titleSize = compact ? 14 : 16

  return (
    <VStack
      spacing={compact ? 4 : 6}
      alignment="leading"
      modifiers={[
        padding({ all: compact ? 12 : 14 }),
        // Solid color is the most reliable containerBackground for WidgetKit.
        containerBackground(BG, 'widget'),
        widgetURL(link),
      ]}
    >
      <HStack spacing={6} alignment="center">
        <Image
          systemName={empty ? 'sparkles' : 'checkmark.circle.fill'}
          size={compact ? 13 : 14}
          color={TEAL}
        />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(TEAL)]}>
          {label}
        </Text>
        <Spacer />
        {!empty && time ? (
          <Image systemName="clock" size={11} color={MUTED} />
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
          {empty ? emptyTitle : String(props.emptyHeadline || 'Soon')}
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
        <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED), lineLimit(2)]}>
          {subtitle}
        </Text>
      ) : null}

      {!compact && !empty ? (
        <HStack spacing={4} alignment="center" modifiers={[padding({ top: 4 })]}>
          <Image systemName="arrow.right.circle.fill" size={12} color={TEAL} />
          <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(TEAL)]}>
            {openLabel}
          </Text>
        </HStack>
      ) : null}
    </VStack>
  )
}

const WahrlyToday = createWidget<WahrlyTodayProps>('WahrlyToday', WahrlyTodayWidget)

export default WahrlyToday
