/**
 * Dynamic Expo config.
 * - Web (Pages): experiments.baseUrl = /3proxy/nova
 * - Native (EAS ios/android): no baseUrl; deep link scheme wahrly://
 */
const IS_NATIVE_EAS =
  process.env.EAS_BUILD_PLATFORM === 'ios' || process.env.EAS_BUILD_PLATFORM === 'android'

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => {
  /** @type {import('expo/config').ExpoConfig} */
  const next = {
    ...config,
    name: 'Wahrly',
    slug: 'wahrly',
    scheme: 'wahrly',
    version: '1.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      // Full-bleed mist glass art — JS AnimatedLaunchSplash continues the motion after hydrate.
      image: './assets/splash/launch-mist-glass.png',
      resizeMode: 'cover',
      backgroundColor: '#0F6E66',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.wahrly.assistant',
      // Synced after EAS autoIncrement for TF build 57.
      buildNumber: '66',
      // Native Sign in with Apple — App ID capability + Supabase Apple enabled.
      usesAppleSignIn: true,
      // Required for expo-widgets ↔ app data sharing (UserDefaults suite).
      entitlements: {
        'com.apple.security.application-groups': ['group.com.wahrly.assistant'],
      },
      infoPlist: {
        CFBundleURLTypes: [{ CFBundleURLSchemes: ['wahrly'] }],
        NSMicrophoneUsageDescription:
          'Wahrly uses the microphone so you can dictate tasks and reminders.',
        ExpoWidgetsAppGroupIdentifier: 'group.com.wahrly.assistant',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
        backgroundColor: '#0F6E66',
      },
      package: 'com.wahrly.assistant',
      permissions: ['RECORD_AUDIO'],
      intentFilters: [
        {
          action: 'VIEW',
          category: ['BROWSABLE', 'DEFAULT'],
          data: [{ scheme: 'wahrly' }],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      'expo-notifications',
      'expo-web-browser',
      'expo-iap',
      'expo-apple-authentication',
      // No-op while usesAppleSignIn is true; strips entitlement if turned off again.
      './plugins/withStripAppleSignInEntitlement',
      [
        'expo-audio',
        {
          microphonePermission: 'Allow Wahrly to use the microphone to dictate tasks.',
        },
      ],
      [
        'expo-widgets',
        {
          groupIdentifier: 'group.com.wahrly.assistant',
          widgets: [
            {
              name: 'WahrlyToday',
              displayName: 'Next task',
              description: 'Shows your nearest upcoming Wahrly task.',
              ios: {
                supportedFamilies: [
                  'systemSmall',
                  'systemMedium',
                  'accessoryRectangular',
                  'accessoryInline',
                ],
              },
            },
          ],
        },
      ],
    ],
    experiments: IS_NATIVE_EAS
      ? { typedRoutes: true }
      : { typedRoutes: true, baseUrl: '/3proxy/nova' },
    extra: {
      ...(config.extra || {}),
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://threeproxy-x9bi.onrender.com',
      publicAppUrl:
        process.env.EXPO_PUBLIC_APP_URL || 'https://ramza107.github.io/3proxy/nova/',
      /** Google OAuth Web client ID (also used for Android/iOS via Supabase). */
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      appEnv: process.env.EXPO_PUBLIC_APP_ENV || '',
      eas: {
        projectId:
          process.env.EAS_PROJECT_ID || 'cd1e9e17-cb36-4664-8395-c9599ae532f9',
        build: {
          experimental: {
            ios: {
              appExtensions: [
                {
                  targetName: 'ExpoWidgetsTarget',
                  bundleIdentifier: 'com.wahrly.assistant.ExpoWidgetsTarget',
                  entitlements: {
                    'com.apple.security.application-groups': [
                      'group.com.wahrly.assistant',
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  }

  return next
}
