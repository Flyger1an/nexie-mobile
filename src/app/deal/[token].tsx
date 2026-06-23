import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { formatMoney, formatShortDate, titleize } from '@/lib/format'
import { tapHaptic } from '@/lib/haptics'
import { orderPortalUrl } from '@/lib/orders-api'
import { isReviewable } from '@/lib/reviews-api'
import { buttonGlass, cardShadow, colors, font, glass, radius } from '@/lib/theme'

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))

// Happy-path negotiation lifecycle (mirrors nexez NEGOTIATION_STATUSES order: negotiation →
// agreement_proposed → held → complete). declined/expired halt; refunded/disputed reverse a settled deal.
const STEPS: { key: string; label: string }[] = [
  { key: 'negotiation', label: 'Requested' },
  { key: 'agreement_proposed', label: 'Agreement proposed' },
  { key: 'held', label: 'Funded' },
  { key: 'complete', label: 'Complete' },
]
const HINTS: Record<string, string> = {
  negotiation: 'You sent your terms — Nexxi is waiting on the seller to respond.',
  agreement_proposed: 'The seller proposed terms. Review the deal and fund it to lock it in.',
  held: 'Your payment is held in escrow until the work is complete.',
  complete: 'This deal is complete.',
  declined: 'The seller declined this deal. Nothing was charged.',
  expired: 'This deal expired before it was funded. Nothing was charged.',
  refunded: 'This deal was refunded.',
  disputed: 'This deal is under dispute — Nexxi is tracking it.',
}

/**
 * Native negotiation/deal detail — a status timeline for one in-flight (or settled) deal, reached
 * from a negotiation in Orders. Renders entirely from the order-summary params (no extra fetch).
 * Money/recourse actions open the existing web portal or seed the chat (agent-gated) — no new path.
 */
export default function DealScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const token = first(params.token)
  const status = first(params.status).toLowerCase()
  const offerName = first(params.offerName) || 'Negotiation'
  const slug = first(params.slug)
  const sellerName = first(params.sellerName) || (slug ? `/${slug}` : 'Nexez seller')
  const amountRaw = first(params.amountCents)
  const amount = formatMoney(amountRaw === '' ? null : Number(amountRaw), first(params.currency))
  const date = formatShortDate(first(params.createdAt))

  const happyIndex = STEPS.findIndex((s) => s.key === status)
  const isReversal = status === 'refunded' || status === 'disputed'
  const isHalted = status === 'declined' || status === 'expired'
  const currentIndex = isReversal ? STEPS.length - 1 : happyIndex
  const hint = HINTS[status] ?? 'Nexxi is handling this deal.'
  const fundNeeded = status === 'agreement_proposed'

  const openPortal = () => {
    tapHaptic()
    if (token) WebBrowser.openBrowserAsync(orderPortalUrl(token)).catch(() => {})
  }
  const askNexxi = () => {
    tapHaptic()
    router.navigate({
      pathname: '/chat',
      params: { seed: `What's the status of my ${offerName} deal with ${sellerName}, and what should I do next?` },
    })
  }
  const leaveReview = () => {
    tapHaptic()
    router.navigate({ pathname: '/review/[token]', params: { token, offerName, sellerName } })
  }
  const bookAgain = () => {
    tapHaptic()
    router.navigate({ pathname: '/chat', params: { seed: `Book the ${offerName} from ${sellerName} again.` } })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>Deal</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>NEGOTIATION</Text>
        <Text accessibilityRole="header" style={styles.title}>{offerName}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.seller} numberOfLines={1}>{sellerName}</Text>
          {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        </View>

        <View style={styles.timelineCard}>
          {isHalted ? (
            <View style={styles.stepRow}>
              <View style={styles.rail}>
                <View style={[styles.node, { backgroundColor: status === 'declined' ? colors.danger : colors.text3 }]} />
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepLabel}>{titleize(status)}</Text>
                <Text style={styles.stepHint}>{hint}</Text>
              </View>
            </View>
          ) : (
            STEPS.map((step, i) => {
              const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo'
              const last = i === STEPS.length - 1
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.rail}>
                    <View
                      style={[
                        styles.node,
                        state === 'done' ? styles.nodeDone : state === 'current' ? styles.nodeCurrent : styles.nodeTodo,
                      ]}
                    >
                      {state === 'done' ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                    {!last ? <View style={[styles.connector, i < currentIndex ? styles.connectorDone : styles.connectorTodo]} /> : null}
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={[styles.stepLabel, state === 'todo' ? styles.stepLabelTodo : null]}>{step.label}</Text>
                    {state === 'current' ? <Text style={styles.stepHint}>{hint}</Text> : null}
                  </View>
                </View>
              )
            })
          )}
          {isReversal ? (
            <View style={styles.reversalNote}>
              <Text style={styles.reversalText}>
                {titleize(status)} — {hint}
              </Text>
            </View>
          ) : null}
        </View>

        {date ? <Text style={styles.date}>Started {date}</Text> : null}

        <Pressable
          style={[buttonGlass.base, styles.primary]}
          onPress={openPortal}
          accessibilityRole="button"
          accessibilityLabel={fundNeeded ? 'Review and fund this deal' : 'Open the full deal and messages'}
        >
          <Text style={buttonGlass.label}>{fundNeeded ? 'Review & fund' : 'Open full deal & messages'}</Text>
        </Pressable>
        {isReviewable(status) ? (
          <Pressable style={styles.ghostBtn} onPress={leaveReview} accessibilityRole="button" accessibilityLabel="Leave a review">
            <Text style={styles.ghostBtnText}>Leave a review</Text>
          </Pressable>
        ) : null}
        {isReviewable(status) ? (
          <Pressable style={styles.ghostBtn} onPress={bookAgain} accessibilityRole="button" accessibilityLabel="Book again">
            <Text style={styles.ghostBtnText}>Book again</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.ghostBtn} onPress={askNexxi} accessibilityRole="button" accessibilityLabel="Ask Nexxi about this deal">
          <Text style={styles.ghostBtnText}>Ask Nexxi about this</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const NODE = 20

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },
  topTitle: { flex: 1, color: colors.text2, fontFamily: font.sans600, fontSize: 14, textAlign: 'center' },
  container: { paddingHorizontal: 18, paddingBottom: 40, gap: 10 },

  eyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4, marginTop: 4 },
  title: { color: colors.text, fontFamily: font.serif, fontSize: 28, lineHeight: 30, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  seller: { flex: 1, color: colors.text2, fontFamily: font.sans, fontSize: 14 },
  amount: { color: colors.text, fontFamily: font.serif, fontSize: 20 },

  timelineCard: { ...glass, borderRadius: radius.lg, padding: 16, paddingBottom: 6, marginTop: 8, ...cardShadow },
  stepRow: { flexDirection: 'row', gap: 12 },
  rail: { width: NODE, alignItems: 'center' },
  node: { width: NODE, height: NODE, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.success },
  nodeCurrent: { backgroundColor: colors.accent },
  nodeTodo: { borderWidth: 1.5, borderColor: colors.text3 },
  check: { color: colors.onAccent, fontSize: 12, fontFamily: font.sans800, lineHeight: 14 },
  connector: { width: 2, flex: 1, minHeight: 18, marginVertical: 2, borderRadius: 1 },
  connectorDone: { backgroundColor: colors.success },
  connectorTodo: { backgroundColor: colors.border },
  stepBody: { flex: 1, paddingBottom: 16 },
  stepLabel: { color: colors.text, fontFamily: font.sans700, fontSize: 15, lineHeight: NODE },
  stepLabelTodo: { color: colors.text3, fontFamily: font.sans600 },
  stepHint: { color: colors.text2, fontFamily: font.sans, fontSize: 13, lineHeight: 19, marginTop: 4 },

  reversalNote: {
    marginTop: 4,
    marginBottom: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: 'rgba(217,162,74,0.10)',
    padding: 10,
  },
  reversalText: { color: colors.amber, fontFamily: font.sans600, fontSize: 13, lineHeight: 19 },

  date: { color: colors.text3, fontFamily: font.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },

  primary: { marginTop: 12 },
  ghostBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { color: colors.text, fontFamily: font.sans700, fontSize: 14 },
})
