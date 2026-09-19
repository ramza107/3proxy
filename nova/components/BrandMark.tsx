import { StyleSheet, View } from 'react-native'
import { colors } from '../constants/theme'

type Props = {
  size?: number
  color?: string
}

/**
 * Infinity × W monogram — continuous signal loop with a W valley.
 * Drawn as overlapping ellipses + center notch so it stays sharp without assets.
 */
export function BrandMark({ size = 36, color = colors.accent }: Props) {
  const stroke = Math.max(2.5, size * 0.12)
  const loopW = size * 0.42
  const loopH = size * 0.38
  const gap = size * 0.02

  return (
    <View style={{ width: size, height: size * 0.72, justifyContent: 'center', alignItems: 'center' }}>
      <View style={styles.row}>
        <View
          style={{
            width: loopW,
            height: loopH,
            borderRadius: loopH / 2,
            borderWidth: stroke,
            borderColor: color,
            marginRight: -gap,
          }}
        />
        <View
          style={{
            width: loopW,
            height: loopH,
            borderRadius: loopH / 2,
            borderWidth: stroke,
            borderColor: color,
            marginLeft: -gap,
          }}
        />
      </View>
      {/* W valley — three short bars meeting at center */}
      <View style={[styles.valley, { bottom: size * 0.02 }]}>
        <View style={[styles.leg, { height: size * 0.22, backgroundColor: color, width: stroke }]} />
        <View
          style={[
            styles.leg,
            {
              height: size * 0.14,
              backgroundColor: color,
              width: stroke,
              transform: [{ translateY: size * 0.04 }],
            },
          ]}
        />
        <View style={[styles.leg, { height: size * 0.22, backgroundColor: color, width: stroke }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  valley: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 5,
  },
  leg: { borderRadius: 2 },
})
