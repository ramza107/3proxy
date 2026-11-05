import { ReactNode } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { AppBackdrop } from './AppBackdrop'
import { colors } from '../constants/theme'

type Props = {
  children: ReactNode
  style?: ViewStyle
  /** Skip the shared atmosphere (ritual / full-bleed screens). */
  plain?: boolean
}

/** App chrome surface — mist field by default so tabs share one sky. */
export function Screen({ children, style, plain }: Props) {
  return (
    <View style={[styles.root, style]}>
      {plain ? <View style={styles.plainWash} /> : <AppBackdrop />}
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  plainWash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
  },
  content: { flex: 1 },
})
