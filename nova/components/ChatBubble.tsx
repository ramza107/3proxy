import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing } from '../constants/theme'

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
          <Text style={styles.avatarText}>N</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        <Text style={styles.text}>{content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: spacing.md,
    paddingRight: 28,
  },
  rowUser: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 40 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accentStrong, fontWeight: '800', fontSize: 12 },
  bubble: {
    maxWidth: '88%',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  user: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 8,
  },
  assistant: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 8,
  },
  text: { color: colors.text, fontSize: 15.5, lineHeight: 22 },
})
