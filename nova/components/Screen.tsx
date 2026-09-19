import { ReactNode } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { colors } from '../constants/theme'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

/** Mist field + vertical signal rail — day as a continuous line. */
export function Screen({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.wash} />
      <View style={styles.rail} pointerEvents="none">
        <View style={styles.railLine} />
        <View style={[styles.node, styles.nodeTop]} />
        <View style={[styles.node, styles.nodeMid]} />
        <View style={[styles.node, styles.nodeBot]} />
      </View>
      <View style={styles.haze} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8EEF1',
  },
  rail: {
    position: 'absolute',
    left: 28,
    top: 120,
    bottom: 100,
    width: 12,
    alignItems: 'center',
    opacity: 0.35,
  },
  railLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.signalLine,
    borderRadius: 1,
  },
  node: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.signal,
    position: 'absolute',
    left: 2,
  },
  nodeTop: { top: '8%' },
  nodeMid: { top: '42%' },
  nodeBot: { top: '78%' },
  haze: {
    position: 'absolute',
    right: -40,
    top: '20%',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: colors.accentGlow,
  },
  content: { flex: 1 },
})
