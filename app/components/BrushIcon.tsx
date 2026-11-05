import { Image, type ImageStyle, type StyleProp, StyleSheet, View } from 'react-native'
import type { ColorValue } from 'react-native'

export type BrushIconName =
  | 'tasks'
  | 'chat'
  | 'plan'
  | 'bills'
  | 'dates'
  | 'shopping'
  | 'life'
  | 'news'
  | 'home'
  | 'settings'
  | 'invest'
  | 'morning'
  | 'evening'
  | 'weekly'

const SOURCES: Record<BrushIconName, number> = {
  tasks: require('../assets/icons/brush/tasks.png'),
  chat: require('../assets/icons/brush/chat.png'),
  plan: require('../assets/icons/brush/plan.png'),
  bills: require('../assets/icons/brush/bills.png'),
  dates: require('../assets/icons/brush/dates.png'),
  shopping: require('../assets/icons/brush/shopping.png'),
  life: require('../assets/icons/brush/life.png'),
  news: require('../assets/icons/brush/news.png'),
  home: require('../assets/icons/brush/home.png'),
  settings: require('../assets/icons/brush/settings.png'),
  invest: require('../assets/icons/brush/invest.png'),
  morning: require('../assets/icons/brush/morning.png'),
  evening: require('../assets/icons/brush/evening.png'),
  weekly: require('../assets/icons/brush/weekly.png'),
}

type Props = {
  name: BrushIconName
  size?: number
  color?: ColorValue
  style?: StyleProp<ImageStyle>
}

/** Unique brush-signal icons — tinted silhouette PNGs. */
export function BrushIcon({ name, size = 28, color, style }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={SOURCES[name]}
        style={[
          styles.img,
          { width: size, height: size },
          color ? { tintColor: color } : null,
          style,
        ]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}

const styles = StyleSheet.create({
  img: {
    width: '100%',
    height: '100%',
  },
})
