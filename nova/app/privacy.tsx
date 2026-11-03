import { type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Screen } from '../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../constants/theme'

const EFFECTIVE = '18 September 2026'
const CONTACT = 'rr.aliev96@gmail.com'
const APP_URL = 'https://ramza107.github.io/3proxy/nova/'
const API_HOST = 'threeproxy-x9bi.onrender.com'

function H({ children }: { children: ReactNode }) {
  return <Text style={styles.h}>{children}</Text>
}
function P({ children }: { children: ReactNode }) {
  return <Text style={styles.p}>{children}</Text>
}
function Bullet({ children }: { children: ReactNode }) {
  return <Text style={styles.bullet}>• {children}</Text>
}

/**
 * In-app Privacy Policy (same text as public-site/privacy for store / Google review).
 * Public URL: https://ramza107.github.io/3proxy/nova/privacy
 */
export default function PrivacyScreen() {
  const router = useRouter()

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          {/* Solid panel so body copy never sinks into the mist painting. */}
          <View style={styles.panel}>
            <Text style={styles.brand}>{brand.name}</Text>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.meta}>Effective date: {EFFECTIVE}</Text>

            <P>
              This Privacy Policy explains how Wahrly (“we”, “the app”) collects, uses, and protects
              information when you use the Wahrly website and mobile apps, including when you connect
              Google Calendar.
            </P>
            <P>
              By using Wahrly, you agree to this policy. If you do not agree, please do not use the
              service or connect your Google account.
            </P>

            <H>1. Who we are</H>
            <P>
              Wahrly is a personal AI life assistant that helps you organize tasks, reminders, and a
              calm daily plan. The product is operated by the Wahrly developer (contact below).
            </P>
            <Bullet>{`Website: ${APP_URL}`}</Bullet>
            <Bullet>{`AI / API server: https://${API_HOST}`}</Bullet>
            <Bullet>{`Contact: ${CONTACT}`}</Bullet>

            <H>2. Information we collect</H>
            <P>Depending on how you use Wahrly, we may process:</P>
            <Bullet>
              Account information — email address and name you provide when signing in (including via
              Supabase Auth when configured).
            </Bullet>
            <Bullet>
              App content you create — tasks, checklists, reminders, chat messages with Wahrly, and
              settings (stored on your device and/or in your Supabase project when connected).
            </Bullet>
            <Bullet>
              Google account data (only after you tap “Connect with Google” and grant permission) —
              limited Calendar access described in section 3.
            </Bullet>
            <Bullet>
              Technical data — basic server logs (timestamps, error messages) needed to keep the
              service running. We do not sell advertising profiles.
            </Bullet>

            <H>3. Google Calendar access</H>
            <P>
              If you connect Google, Wahrly requests only calendar.readonly (plus basic account email
              for the connected-account label). Wahrly does not request Gmail scopes and does not read
              your mail. Reconnect in Settings if you connected earlier with mail scopes so Google
              drops them.
            </P>
            <P>With those permissions, Wahrly may:</P>
            <Bullet>
              Read today’s events from your primary Google Calendar to show them on the Home signal
              timeline and to avoid those times when packing Plan day.
            </Bullet>
            <P>Wahrly does not:</P>
            <Bullet>Read, send, draft, delete, or modify your email.</Bullet>
            <Bullet>Create, edit, or delete Google Calendar events.</Bullet>
            <Bullet>Read your calendar without your explicit Connect / Allow step.</Bullet>
            <Bullet>Sell your Google content to third parties.</Bullet>
            <P>
              Google OAuth tokens (access / refresh) are stored on our API server so calendar events
              can refresh without asking you to Allow every day. You can disconnect Google at any time
              in Settings; we then delete the stored tokens for your account.
            </P>
            <P>
              Wahrly’s use of information received from Google APIs will adhere to the Google API
              Services User Data Policy, including the Limited Use requirements.
            </P>

            <H>4. How we use information</H>
            <Bullet>Provide and improve Wahrly features (tasks, chat, morning brief, calendar).</Bullet>
            <Bullet>Authenticate you and keep your session secure.</Bullet>
            <Bullet>
              Call AI providers (for example Groq or OpenAI) with the text needed to answer your chat
              — not for unrelated advertising.
            </Bullet>
            <Bullet>Comply with law if required.</Bullet>

            <H>5. AI processing</H>
            <P>
              When you chat with Wahrly, message text may be sent to our API server and then to the
              configured AI provider to generate a reply. Do not paste secrets (passwords, bank codes)
              into chat.
            </P>

            <H>6. Storage and retention</H>
            <P>
              Local app data stays on your device until you clear app storage or delete the account
              data. Server-side Google tokens are kept while your Google connection is active and
              removed on disconnect. Logs are kept only as long as needed for operations and abuse
              prevention.
            </P>

            <H>7. Sharing</H>
            <P>
              We do not sell your personal information. We share data only with processors needed to
              run Wahrly (hosting, auth, AI APIs) under their terms, or when required by law.
            </P>

            <H>8. Security</H>
            <P>
              We use HTTPS and industry-standard practices to protect tokens and accounts. No method
              of transmission is 100% secure; please use a strong password for your Wahrly account.
            </P>

            <H>9. Children’s privacy</H>
            <P>
              Wahrly is not directed at children under 13. We do not knowingly collect personal
              information from children under 13.
            </P>

            <H>10. Your choices</H>
            <Bullet>Disconnect Google Calendar in Settings at any time.</Bullet>
            <Bullet>Delete your account in Settings → Delete account (clears local data too).</Bullet>
            <Bullet>Delete local data by clearing app storage / uninstalling.</Bullet>
            <Bullet>Email us if you need extra server-side cleanup after delete.</Bullet>

            <H>11. Changes</H>
            <P>
              We may update this policy. The effective date above will change when we do. Continued
              use after an update means you accept the revised policy.
            </P>

            <H>12. Contact</H>
            <P>Questions about privacy or Google data: {CONTACT}</P>
            <Pressable
              onPress={() => Linking.openURL(`mailto:${CONTACT}?subject=Wahrly%20Privacy`)}
              style={styles.mailBtn}
            >
              <Text style={styles.mailBtnText}>Email us</Text>
            </Pressable>

            <Text style={styles.foot}>
              Also available as plain text for Google review in the repository docs.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 48,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  back: { marginBottom: 10 },
  backText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 14 },
  panel: {
    backgroundColor: colors.bgCardSolid,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  brand: {
    color: colors.accentStrong,
    fontFamily: fonts.brand,
    fontSize: 18,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.brand,
    fontSize: 32,
    letterSpacing: -0.6,
  },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, marginBottom: 8 },
  h: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    marginTop: spacing.md,
  },
  p: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  bullet: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    paddingLeft: 4,
  },
  mailBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgDeep,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    marginTop: 8,
  },
  mailBtnText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold },
  foot: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: spacing.lg,
  },
})
