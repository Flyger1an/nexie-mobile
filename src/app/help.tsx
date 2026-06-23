import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { tapHaptic } from '@/lib/haptics'
import { buttonGlass, cardShadow, colors, font, glass, radius } from '@/lib/theme'

// Where general support requests go. Confirm this mailbox exists (privacy@ / legal@ are configured;
// a general support@ should be set up or this constant pointed at the right address).
const SUPPORT_EMAIL = 'support@nexez.app'

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Nexxi?',
    a: 'Your personal buyer agent. Tell Nexxi what you want to buy, book, or negotiate — by text or voice — and it searches the agent-ready web, compares offers, and handles the back-and-forth for you.',
  },
  {
    q: 'Does Nexxi ever spend money on its own?',
    a: 'No. Nexxi always shows you an approval card and waits for your tap before it negotiates or opens checkout. Nothing is charged without your approval.',
  },
  {
    q: 'Is my payment secure?',
    a: "Yes. Checkout happens on Stripe's secure page — Nexxi never sees or stores your card details.",
  },
  {
    q: 'How do I get a refund or report a problem?',
    a: 'Open the order from the Orders tab, then choose Request a refund or Report a problem. Requests go straight to the seller, who handles the response.',
  },
  {
    q: 'What happens when I delete my account?',
    a: 'It removes your Nexxi buyer data — chats, preferences, and order history. If you also sell on Nexez, that account and login are separate and stay untouched.',
  },
  {
    q: 'Voice & microphone',
    a: "When you use voice, your speech is turned into text on your device. Nexxi doesn't store audio recordings.",
  },
]

/** Help & Support — FAQ + a contact channel. Public route (no seller-account dependency). */
export default function HelpScreen() {
  const router = useRouter()

  const emailSupport = () => {
    tapHaptic()
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Nexxi support')}`
    Linking.openURL(url).catch(() => {})
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>Help</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>HELP & SUPPORT</Text>
        <Text accessibilityRole="header" style={styles.title}>How can we help?</Text>

        <View style={styles.faqCard}>
          {FAQ.map((item, i) => (
            <View key={item.q} style={[styles.faqRow, i > 0 ? styles.faqDivider : null]}>
              <Text accessibilityRole="header" style={styles.q}>{item.q}</Text>
              <Text style={styles.a}>{item.a}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.contactHint}>Still need help? Reach our team directly.</Text>
        <Pressable
          style={[buttonGlass.base, styles.primary]}
          onPress={emailSupport}
          accessibilityRole="button"
          accessibilityLabel={`Email support at ${SUPPORT_EMAIL}`}
        >
          <Text style={buttonGlass.label}>Email support</Text>
        </Pressable>

        <View style={styles.legalRow}>
          <Pressable accessibilityRole="link" accessibilityLabel="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync('https://nexez.ai/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable accessibilityRole="link" accessibilityLabel="Terms of Service" onPress={() => WebBrowser.openBrowserAsync('https://nexez.ai/terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },
  topTitle: { flex: 1, color: colors.text2, fontFamily: font.sans600, fontSize: 14, textAlign: 'center' },
  container: { paddingHorizontal: 18, paddingBottom: 40, gap: 12 },

  eyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4, marginTop: 4 },
  title: { color: colors.text, fontFamily: font.serif, fontSize: 30, lineHeight: 32, letterSpacing: -0.3 },

  faqCard: { ...glass, borderRadius: radius.lg, padding: 4, marginTop: 6, ...cardShadow },
  faqRow: { paddingHorizontal: 12, paddingVertical: 14, gap: 6 },
  faqDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  q: { color: colors.text, fontFamily: font.sans700, fontSize: 15, lineHeight: 20 },
  a: { color: colors.text2, fontFamily: font.sans, fontSize: 14, lineHeight: 21 },

  contactHint: { color: colors.text2, fontFamily: font.sans, fontSize: 14, marginTop: 8, textAlign: 'center' },
  primary: { marginTop: 2 },

  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  legalLink: { color: colors.text2, fontFamily: font.sans600, fontSize: 13 },
  legalDot: { color: colors.text3, fontSize: 13 },
})
