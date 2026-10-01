import { useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { colors, fonts, radii } from '../constants/theme'
import {
  appleSignInAvailable,
  nativeAppleSignInEnabled,
  signInWithApple,
  signInWithGoogle,
} from '../lib/socialAuth'
import { isSupabaseConfigured } from '../lib/supabase'
import { useT } from '../lib/useT'

function AppleNativeButton({
  onPress,
}: {
  onPress: () => void
}) {
  // Lazy require keeps Metro happy when the native module is excluded on iOS.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AppleAuthentication = require('expo-apple-authentication')
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radii.md}
      style={styles.appleNative}
      onPress={onPress}
    />
  )
}

type Props = {
  onSuccess: () => void
  onError: (message: string) => void
}

export function SocialAuthButtons({ onSuccess, onError }: Props) {
  const t = useT()
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null)

  if (!isSupabaseConfigured) {
    return (
      <Text style={styles.hint}>{t('auth.socialNeedsSupabase')}</Text>
    )
  }

  const run = async (kind: 'google' | 'apple') => {
    setBusy(kind)
    try {
      const result =
        kind === 'google' ? await signInWithGoogle() : await signInWithApple()
      if (!result.redirected) onSuccess()
      // web OAuth redirects away — success handled after return
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('auth.socialFailed')
      if (!/cancel/i.test(msg)) onError(msg)
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        style={[styles.btn, styles.google]}
        disabled={!!busy}
        onPress={() => run('google')}
      >
        {busy === 'google' ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.googleText}>{t('auth.continueGoogle')}</Text>
        )}
      </Pressable>

      {Platform.OS === 'android' ? (
        <Text style={styles.androidHint}>{t('auth.androidGoogleHint')}</Text>
      ) : null}

      {Platform.OS === 'ios' && nativeAppleSignInEnabled() ? (
        <AppleNativeButton onPress={() => run('apple')} />
      ) : null}

      {appleSignInAvailable() &&
      (Platform.OS === 'web' ||
        (Platform.OS === 'ios' && !nativeAppleSignInEnabled())) ? (
        <Pressable
          accessibilityRole="button"
          style={[styles.btn, styles.apple]}
          disabled={!!busy}
          onPress={() => run('apple')}
        >
          {busy === 'apple' ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.appleText}>{t('auth.continueApple')}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  androidHint: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -4,
  },
  btn: {
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-expect-error web-only
    cursor: 'pointer',
  },
  google: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  googleText: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  apple: {
    backgroundColor: '#111111',
  },
  appleText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  appleNative: {
    width: '100%',
    height: 48,
  },
})
