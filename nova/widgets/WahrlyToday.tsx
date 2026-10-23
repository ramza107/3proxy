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
 * Nearest-task widget for Home Screen + Lock Screen.
 *
 * IMPORTANT: the layout function is extracted and re-evaluated inside the
 * widget extension's bare JSC. It must not close over module-level consts
 * (those become ReferenceError → red/black card). Inline every literal.
 *
 * Lock Screen accessory families sit on the wallpaper with no mint plate —
 * hardcoded ink (#12252C) disappears on dark photos. Use hierarchical
 * system colors there so iOS can apply vibrancy / light text.
 *
 * Text-only — no Image/HStack/Spacer/symbolEffect — so a single failing
 * native view type cannot blank the whole card in release builds.
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

function WahrlyTodayWidget(props: WahrlyTodayProps, env: WidgetEnvironment) {
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

  const family = String((env && env.widgetFamily) || 'systemSmall')
  const mode = String((env && env.widgetRenderingMode) || 'fullColor')
  const isAccessory = family.indexOf('accessory') === 0
  const useAdaptive = isAccessory || mode === 'vibrant' || mode === 'accented'

  // Lock Screen inline: one glanceable line under the clock.
  if (family === 'accessoryInline') {
    const line = time ? `${time} · ${title}` : title
    return (
      <Text
        modifiers={[
          font({ size: 15, weight: 'semibold' }),
          foregroundStyle({ type: 'hierarchical', style: 'primary' }),
          lineLimit(1),
          widgetURL(link),
        ]}
      >
        {line}
      </Text>
    )
  }

  // Lock Screen rectangular: compact, system vibrancy (no mint plate).
  if (isAccessory) {
    const line = time ? `${time}  ${title}` : title
    return (
      <VStack
        spacing={2}
        alignment="leading"
        modifiers={[padding({ all: 4 }), widgetURL(link)]}
      >
        <Text
          modifiers={[
            font({ size: 11, weight: 'semibold' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            lineLimit(1),
          ]}
        >
          {label}
        </Text>
        <Text
          modifiers={[
            font({ size: 15, weight: 'bold', design: 'rounded' }),
            foregroundStyle({ type: 'hierarchical', style: 'primary' }),
            lineLimit(2),
          ]}
        >
          {line}
        </Text>
        {subtitle ? (
          <Text
            modifiers={[
              font({ size: 12, weight: 'medium' }),
              foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
              lineLimit(1),
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </VStack>
    )
  }

  // Home Screen cards keep the mint plate + ink type.
  const ink = useAdaptive
    ? { type: 'hierarchical' as const, style: 'primary' as const }
    : '#12252C'
  const teal = useAdaptive
    ? { type: 'hierarchical' as const, style: 'secondary' as const }
    : '#0F6E66'
  const muted = useAdaptive
    ? { type: 'hierarchical' as const, style: 'tertiary' as const }
    : '#5A717A'
  const stackModifiers = useAdaptive
    ? [padding({ all: 14 }), widgetURL(link)]
    : [padding({ all: 14 }), containerBackground('#D8EBE6', 'widget'), widgetURL(link)]

  return (
    <VStack spacing={6} alignment="leading" modifiers={stackModifiers}>
      <Text
        modifiers={[
          font({ size: 11, weight: 'semibold' }),
          foregroundStyle(teal),
        ]}
      >
        {label}
      </Text>
      <Text
        modifiers={[
          font({ size: time ? 28 : 18, weight: 'bold', design: 'rounded' }),
          foregroundStyle(ink),
          lineLimit(2),
        ]}
      >
        {time || emptyTitle}
      </Text>
      {time ? (
        <Text
          modifiers={[
            font({ size: 14, weight: 'medium' }),
            foregroundStyle(ink),
            lineLimit(3),
          ]}
        >
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle(muted),
            lineLimit(2),
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </VStack>
  )
}

const WahrlyToday = createWidget<WahrlyTodayProps>('WahrlyToday', WahrlyTodayWidget)

export default WahrlyToday
