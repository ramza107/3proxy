/**
 * Google + Apple sign-in via Supabase.
 * - Google: OAuth (Android / iOS / web) — primary path on Android
 * - Apple: native Sign in with Apple on iOS; OAuth fallback on web
 */
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Linking from 'expo-linking'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import { getSupabase, isSupabaseConfigured } from './supabase'
import { useNovaStore } from './store'

WebBrowser.maybeCompleteAuthSession()

export type SocialProvider = 'google' | 'apple'

function authRedirectTo() {
  // Native: wahrly:// ; web: current origin (+ Pages base path when hosted).
  return makeRedirectUri({
    scheme: 'wahrly',
    path: 'auth/callback',
  })
}

async function applySessionUser(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const meta = user.user_metadata || {}
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.given_name === 'string' && meta.given_name) ||
    null

  useNovaStore.setState({
    demoMode: false,
    sessionUserId: user.id,
    sessionEmail: user.email || null,
  })

  if (name) {
    useNovaStore.getState().updateSettings({ name })
  }

  const supabase = getSupabase()
  if (supabase && user.email) {
    await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name,
      })
      .then(() => undefined)
      .catch(() => undefined)
  }
}

/** Parse access/refresh tokens from OAuth redirect URL and set Supabase session. */
export async function createSessionFromUrl(url: string) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')

  const { params, errorCode } = QueryParams.getQueryParams(url)
  if (errorCode) throw new Error(errorCode)

  const access_token = params.access_token
  const refresh_token = params.refresh_token
  if (!access_token) {
    // Some flows land without tokens (user cancelled / misconfigured redirect).
    return null
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || '',
  })
  if (error) throw error
  if (data.user) await applySessionUser(data.user)
  return data.session
}

async function signInWithOAuthProvider(provider: SocialProvider) {
  const supabase = getSupabase()
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase is not configured — resume the project or set EXPO_PUBLIC_SUPABASE_*')
  }

  const redirectTo = authRedirectTo()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams:
        provider === 'google'
          ? { access_type: 'offline', prompt: 'select_account' }
          : undefined,
    },
  })
  if (error) throw error
  if (!data.url) throw new Error('No OAuth URL returned')

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Full-page redirect is the most reliable on static web / GitHub Pages.
    window.location.assign(data.url)
    return { redirected: true as const }
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Sign-in cancelled')
    }
    throw new Error('Sign-in did not complete')
  }

  await createSessionFromUrl(result.url)
  return { redirected: false as const }
}

/** Google — works on Android, iOS, and web (primary Android path). */
export async function signInWithGoogle() {
  return signInWithOAuthProvider('google')
}

/** Apple — native sheet on iOS; OAuth on web. Hidden on Android (use Google). */
export async function signInWithApple() {
  if (Platform.OS === 'ios') {
    const available = await AppleAuthentication.isAvailableAsync()
    if (!available) {
      return signInWithOAuthProvider('apple')
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    if (!credential.identityToken) {
      throw new Error('Apple Sign-In did not return an identity token')
    }

    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    })
    if (error) throw error
    if (!data.user) throw new Error('No user returned from Apple Sign-In')

    // Apple only sends the name on the first authorization.
    if (credential.fullName) {
      const parts = [
        credential.fullName.givenName,
        credential.fullName.middleName,
        credential.fullName.familyName,
      ].filter(Boolean) as string[]
      const fullName = parts.join(' ').trim()
      if (fullName) {
        await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            name: fullName,
            given_name: credential.fullName.givenName,
            family_name: credential.fullName.familyName,
          },
        })
      }
    }

    await applySessionUser(data.user)
    return { redirected: false as const }
  }

  if (Platform.OS === 'android') {
    throw new Error('On Android use Google Sign-In')
  }

  return signInWithOAuthProvider('apple')
}

export function appleSignInAvailable() {
  return Platform.OS === 'ios' || Platform.OS === 'web'
}

export function googleSignInAvailable() {
  return true
}

/** Deep-link listener helper for OAuth returns while the app is open. */
export function subscribeAuthUrl(onUrl: (url: string) => void) {
  const sub = Linking.addEventListener('url', ({ url }) => onUrl(url))
  return () => sub.remove()
}
