import { StyleSheet, Text, View } from 'react-native'
import { colors, fonts, radii, spacing } from '../constants/theme'

type Props = {
  role: 'user' | 'assistant'
  content: string
}

export function ChatBubble({ role, content }: Props) {
  const isUser = role === 'user'
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>W</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        <Text style={isUser ? styles.textUser : styles.text}>{content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: spacing.md,
    paddingRight: 36,
  },
  rowUser: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 48 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textOnAccent,
    fontFamily: fonts.brand,
    fontSize: 12,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  user: {
    backgroundColor: colors.bgDeep,
    borderBottomRightRadius: 6,
  },
  assistant: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 4,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
  },
  textUser: {
    color: colors.textOnAccent,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
  },
})
