import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Screen } from '../components/Screen'
import { brand, colors, fonts, radii, spacing } from '../constants/theme'

const EFFECTIVE = '18 September 2026'
const CONTACT = 'rr.aliev96@gmail.com'
const APP_URL = 'https://ramza107.github.io/3proxy/nova/'
const API_HOST = 'threeproxy-x9bi.onrender.com'

function H({ children }: { children: string }) {
  return <Text style={styles.h}>{children}</Text>
}
function P({ children }: { children: string }) {
  return <Text style={styles.p}>{children}</Text>
}
function Bullet({ children }: { children: string }) {
  return <Text style={styles.bullet}>• {children}</Text>
}

/**
 * Public Privacy Policy for Google OAuth verification and users.
 * Live URL (after Pages deploy): https://ramza107.github.io/3proxy/nova/privacy
 */
export default function PrivacyScreen() {
  const router = useRouter()

  return (
    <Screen>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <Text style={styles.brand}>{brand.name}</Text>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.meta}>Effective date: {EFFECTIVE}</Text>

          <P>
            This Privacy Policy explains how Wahrly (“we”, “the app”) collects, uses, and protects
            information when you use the Wahrly website and mobile apps, including when you connect
            Google / Gmail.
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
            limited Gmail access described in section 3.
          </Bullet>
          <Bullet>
            Technical data — basic server logs (timestamps, error messages) needed to keep the
            service running. We do not sell advertising profiles.
          </Bullet>

          <H>3. Google / Gmail + Calendar access</H>
          <P>
            If you connect Google, Wahrly requests read-only scopes: gmail.readonly and
            calendar.readonly.
          </P>
          <P>With those permissions, Wahrly may:</P>
          <Bullet>
            Read recent inbox messages to build a morning brief (who wrote to you, typically for the
            previous local calendar day).
          </Bullet>
          <Bullet>
            Read messages in Sent to detect open commitments you wrote (for example “I’ll send…” /
            “я перезвоню…”) and suggest turning them into tasks — only if you use the Promises
            feature.
          </Bullet>
          <Bullet>
            Read today’s events from your primary Google Calendar to show them on the Home signal
            timeline.
          </Bullet>
          <P>Wahrly does not:</P>
          <Bullet>Send, delete, or modify your email.</Bullet>
          <Bullet>Create, edit, or delete calendar events.</Bullet>
          <Bullet>Read your mail or calendar without your explicit Connect / Allow step.</Bullet>
          <Bullet>Sell your Google content to third parties.</Bullet>
          <P>
            Google OAuth tokens (access / refresh) are stored on our API server so briefs can be
            refreshed without asking you to Allow every day. You can disconnect Google at any time in
            Settings; we then delete the stored tokens for your account.
          </P>
          <P>
            Wahrly’s use of information received from Google APIs will adhere to the Google API
            Services User Data Policy, including the Limited Use requirements.
          </P>

          <H>4. How we use information</H>
          <Bullet>Provide and improve Wahrly features (tasks, chat, morning brief, promises).</Bullet>
          <Bullet>Authenticate you and keep your session secure.</Bullet>
          <Bullet>Call AI providers (for example Groq or OpenAI) with the text needed to answer
            your chat or summarize mail highlights — not for unrelated advertising.</Bullet>
          <Bullet>Comply with law if required.</Bullet>

          <H>5. AI processing</H>
          <P>
            When you chat with Wahrly or enable mail summaries, message text (and limited mail
            metadata / snippets needed for the brief or promise detection) may be sent to our API
            server and then to the configured AI provider to generate a reply or summary. Do not
            paste secrets (passwords, bank codes) into chat.
          </P>

          <H>6. Storage and retention</H>
          <Bullet>
            On-device / local storage — tasks and settings may be cached on your phone or browser.
          </Bullet>
          <Bullet>
            Supabase (when configured) — account and task data under your project’s access controls.
          </Bullet>
          <Bullet>
            API server — Gmail OAuth tokens while connected; short-lived processing of mail for
            digests/promises. We do not keep a full archive of your mailbox.
          </Bullet>
          <P>
            You can clear local data by signing out / clearing site data. Disconnect Gmail to remove
            server tokens. For account deletion requests, contact us at the email above.
          </P>

          <H>7. Sharing</H>
          <P>We share data only as needed to run the product:</P>
          <Bullet>Google — when you authorize Gmail access.</Bullet>
          <Bullet>Hosting / auth / AI providers we configure (for example Render, Supabase, Groq,
            OpenAI) under their respective terms.</Bullet>
          <Bullet>Authorities if legally required.</Bullet>
          <P>We do not sell your personal information.</P>

          <H>8. Security</H>
          <P>
            We use HTTPS, store secrets on the server (not in the mobile app bundle), and limit
            Gmail access to read-only. No method of transmission or storage is 100% secure; please
            use a strong account password and disconnect Gmail if you stop using Wahrly.
          </P>

          <H>9. Children</H>
          <P>
            Wahrly is not directed at children under 13 (or the minimum age in your country). We do
            not knowingly collect data from children.
          </P>

          <H>10. Your choices</H>
          <Bullet>Use Wahrly without connecting Gmail (tasks and chat still work in demo / local
            modes).</Bullet>
          <Bullet>Disconnect Gmail in Settings.</Bullet>
          <Bullet>Revoke access anytime in your Google Account → Security → Third-party access.</Bullet>
          <Bullet>Contact us to ask questions or request deletion of server-side tokens / account
            data we control.</Bullet>

          <H>11. International users</H>
          <P>
            Servers may be located in the United States or other regions used by our hosting
            providers. By using Wahrly you understand that processing may occur outside your home
            country with appropriate safeguards used by those providers.
          </P>

          <H>12. Changes</H>
          <P>
            We may update this policy. The “Effective date” at the top will change. Continued use
            after an update means you accept the revised policy.
          </P>

          <H>13. Contact</H>
          <P>
            Questions about privacy or Google data: {CONTACT}
          </P>
          <Pressable
            onPress={() => Linking.openURL(`mailto:${CONTACT}?subject=Wahrly%20Privacy`)}
            style={styles.mailBtn}
          >
            <Text style={styles.mailBtnText}>Email us</Text>
          </Pressable>

          <Text style={styles.foot}>
            Also available as plain text for Google review in the repository docs.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
    gap: 10,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  back: { marginBottom: 8 },
  backText: { color: colors.accentStrong, fontFamily: fonts.bodyMedium, fontSize: 14 },
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
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  bullet: {
    color: colors.textMuted,
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
