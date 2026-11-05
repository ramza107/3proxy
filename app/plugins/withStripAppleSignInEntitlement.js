/**
 * expo-apple-authentication is auto-applied by Expo prebuild whenever the
 * package is installed, and its plugin ALWAYS adds
 * com.apple.developer.applesignin — even when ios.usesAppleSignIn is false.
 *
 * Our App Store provisioning profile does not include that capability yet.
 * Strip the entitlement so production EAS builds can sign. Re-enable after
 * regenerating profiles with Sign In with Apple on the App ID.
 */
const {
  withEntitlementsPlist,
  createRunOncePlugin,
} = require('expo/config-plugins')

function withStripAppleSignInEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    if (cfg.ios?.usesAppleSignIn) {
      return cfg
    }
    delete cfg.modResults['com.apple.developer.applesignin']
    return cfg
  })
}

module.exports = createRunOncePlugin(
  withStripAppleSignInEntitlement,
  'with-strip-apple-signin-entitlement',
  '1.0.0',
)
