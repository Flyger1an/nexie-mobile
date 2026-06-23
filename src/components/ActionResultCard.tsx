import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { buttonGlass, cardShadow, colors, font, radius } from '@/lib/theme'
import type { NexieCard } from '@/lib/types'

export function ActionResultCard({ card }: { card: Extract<NexieCard, { type: 'action_result' }> }) {
  const ok = card.status === 'success'
  const router = useRouter()

  async function open() {
    if (!card.url) return
    // In-app browser (SFSafariViewController / Chrome Custom Tab) so the buyer returns
    // to Nexie after Stripe checkout / the provider handoff — never stranded in Safari.
    await WebBrowser.openBrowserAsync(card.url)
    // Back in the app: switch to the Orders tab to track it. The order lands there once
    // the Stripe webhook fires (and they get a push), so pull-to-refresh if it's a beat behind.
    router.navigate('/orders')
  }

  return (
    <View style={styles.card}>
      <View
        style={[styles.topRule, ok ? null : styles.topRuleError]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[styles.eyebrow, ok ? null : styles.eyebrowError]}>
        {ok ? 'CONFIRMED' : 'ACTION FAILED'}
      </Text>
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.description}>{card.description}</Text>
      {card.url ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Open secure link" style={styles.button} onPress={open}>
          <View style={styles.lock} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.lockShackle} />
            <View style={styles.lockBody} />
          </View>
          <Text style={styles.buttonText}>Open secure link</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.sheen,
    backgroundColor: colors.panel,
    padding: 16,
    paddingTop: 18,
    gap: 8,
    overflow: 'hidden',
    ...cardShadow,
  },
  topRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.success,
  },
  topRuleError: {
    backgroundColor: colors.danger,
  },
  eyebrow: {
    color: colors.success,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  eyebrowError: {
    color: colors.danger,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  description: {
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    ...buttonGlass.base,
    ...buttonGlass.confirm,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    marginTop: 4,
  },
  lock: {
    width: 11,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lockShackle: {
    width: 7,
    height: 6,
    borderColor: colors.confirmInk,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 3.5,
    marginBottom: -1,
  },
  lockBody: {
    width: 11,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.confirmInk,
  },
  buttonText: {
    ...buttonGlass.label,
    ...buttonGlass.confirmLabel,
    fontFamily: font.sans700,
    fontSize: 12,
  },
})
