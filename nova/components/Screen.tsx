import { ReactNode } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { colors } from '../constants/theme'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

/** Quiet mist field — no decorative rail (content owns the signal line). */
export function Screen({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.wash} />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
  },
  content: { flex: 1 },
})
