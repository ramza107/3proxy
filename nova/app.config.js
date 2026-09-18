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
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#E7EEF2',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.wahrly.assistant',
      infoPlist: {
        CFBundleURLTypes: [{ CFBundleURLSchemes: ['wahrly'] }],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
        backgroundColor: '#E7EEF2',
      },
      package: 'com.wahrly.assistant',
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
    plugins: ['expo-router', 'expo-secure-store', 'expo-notifications'],
    experiments: IS_NATIVE_EAS
      ? { typedRoutes: true }
      : { typedRoutes: true, baseUrl: '/3proxy/nova' },
    extra: {
      ...(config.extra || {}),
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://threeproxy-x9bi.onrender.com',
      publicAppUrl:
        process.env.EXPO_PUBLIC_APP_URL || 'https://ramza107.github.io/3proxy/nova/',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
      },
    },
  }

  return next
}
