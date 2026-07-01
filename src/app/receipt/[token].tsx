import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { formatMoney, formatShortDate } from '@/lib/format'
import { tapHaptic } from '@/lib/haptics'
import { fetchOrderDetail } from '@/lib/order-detail-api'
import { orderPortalUrl } from '@/lib/orders-api'
import { buttonGlass, cardShadow, colors, font, glass, radius } from '@/lib/theme'
import type { NexieOrderDetail, NexieStatusTone } from '@/lib/types'

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))

const toneColor: Record<NexieStatusTone, string> = {
  positive: colors.success,
  warning: colors.amber,
  pending: colors.accent,
  neutral: colors.text2,
}

/**
 * Native receipt / order detail for a direct-checkout order, reached from Orders. Header paints
 * instantly from the passed params; the account-bound detail fetch fills the status copy, a small
 * timeline, and any refund / problem-report requests + their status. Money/recourse actions open the
 * existing web portal (no new write path) or seed the chat.
 */
export default function ReceiptScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const params = useLocalSearchParams()
  const token = first(params.token)

  // Instant header from params (Orders passes these); the fetch fills the rest.
  const offerName = first(params.offerName) || 'Order'
  const slug = first(params.slug)
  const sellerName = first(params.sellerName) || (slug ? `/${slug}` : 'Nexez seller')
  const amountParam = first(params.amountCents)
  const currency = first(params.currency) || 'usd'
  const date = formatShortDate(first(params.createdAt))

  const [detail, setDetail] = useState<NexieOrderDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(token && session))
  const [error, setError] = useState('')

  // Load the detail — setState only inside promise callbacks (never the effect body).
  useEffect(() => {
    if (!token || !session) return
    let active = true
    fetchOrderDetail(session, token)
      .then((d) => {
        if (!active) return
        setDetail(d)
        setError('')
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load this receipt.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token, session])

  // Prefer the authoritative fetched amount; fall back to the param for the instant header.
  const amountCents = detail ? detail.amountCents : amountParam === '' ? null : Number(amountParam)
  const amount = formatMoney(amountCents, detail?.currency || currency)
  const reference = detail?.reference

  const openPortal = () => {
    tapHaptic()
    if (token) WebBrowser.openBrowserAsync(orderPortalUrl(token)).catch(() => {})
  }
  const leaveReview = () => {
    tapHaptic()
    router.navigate({ pathname: '/review/[token]', params: { token, offerName, sellerName } })
  }
  const askNexxi = () => {
    tapHaptic()
    router.navigate({
      pathname: '/chat',
      params: { seed: `What's the status of my ${offerName} order from ${sellerName}, and what should I do next?` },
    })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>Receipt</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>ORDER</Text>
        <Text accessibilityRole="header" style={styles.title}>{offerName}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.seller} numberOfLines={1}>{sellerName}</Text>
          {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        </View>

        {/* Status + description */}
        {detail ? (
          <View style={styles.statusCard}>
            <View style={styles.statusHead}>
              <View style={[styles.statusPill, { borderColor: toneColor[detail.statusTone] }]}>
                <Text style={[styles.statusText, { color: toneColor[detail.statusTone] }]}>{detail.statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.statusDesc}>{detail.statusDescription}</Text>
          </View>
        ) : null}

        {/* Timeline */}
        <View style={styles.card}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Loading receipt…</Text>
            </View>
          ) : error && !detail ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : detail ? (
            detail.timeline.map((step, i) => {
              const last = i === detail.timeline.length - 1
              const state = step.current ? 'current' : step.done ? 'done' : 'todo'
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.rail}>
                    <View style={[styles.node, state === 'done' ? styles.nodeDone : state === 'current' ? styles.nodeCurrent : styles.nodeTodo]}>
                      {state === 'done' ? <Text style={styles.check}>✓</Text> : null}
                    </View>
                    {!last ? <View style={[styles.connector, step.done ? styles.connectorDone : styles.connectorTodo]} /> : null}
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={[styles.stepLabel, state === 'todo' ? styles.stepLabelTodo : null]}>{step.label}</Text>
                  </View>
                </View>
              )
            })
          ) : null}
        </View>

        {/* Refund / problem requests — the refund status timeline */}
        {detail && detail.requests.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionEyebrow}>REQUESTS</Text>
            {detail.requests.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                <View style={styles.requestTextCol}>
                  <Text style={styles.requestKind}>{r.kindLabel}</Text>
                  {r.message ? <Text style={styles.requestMsg} numberOfLines={2}>{r.message}</Text> : null}
                  <Text style={styles.requestDate}>{formatShortDate(r.createdAt) ?? ''}</Text>
                </View>
                <Text style={styles.requestStatus}>{r.statusLabel}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Reference + date */}
        <View style={styles.footRow}>
          {date ? <Text style={styles.foot}>Placed {date}</Text> : null}
          {reference ? <Text style={styles.foot} numberOfLines={1}>Ref {reference}</Text> : null}
        </View>

        {/* Actions */}
        {detail?.canReview ? (
          <Pressable style={[buttonGlass.base, styles.primary]} onPress={leaveReview} accessibilityRole="button" accessibilityLabel="Leave a review">
            <Text style={buttonGlass.label}>Leave a review</Text>
          </Pressable>
        ) : null}
        {detail?.canRequestRefund ? (
          <Pressable style={styles.ghostBtn} onPress={openPortal} accessibilityRole="button" accessibilityLabel="Request a refund or report a problem">
            <Text style={styles.ghostBtnText}>Request a refund · report a problem</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.ghostBtn} onPress={askNexxi} accessibilityRole="button" accessibilityLabel="Ask Nexxi about this order">
          <Text style={styles.ghostBtnText}>Ask Nexxi about this</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={openPortal} accessibilityRole="button" accessibilityLabel="View this order online">
          <Text style={styles.linkText}>View this order online →</Text>
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
  amount: { color: colors.text, fontFamily: font.serif, fontSize: 22 },

  statusCard: { ...glass, borderRadius: radius.lg, padding: 14, gap: 8, marginTop: 8, ...cardShadow },
  statusHead: { flexDirection: 'row' },
  statusPill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'transparent' },
  statusText: { fontFamily: font.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  statusDesc: { color: colors.text2, fontFamily: font.sans, fontSize: 13, lineHeight: 19 },

  card: { ...glass, borderRadius: radius.lg, padding: 16, paddingBottom: 6, ...cardShadow },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 },
  loadingText: { color: colors.text2, fontFamily: font.sans, fontSize: 14 },
  errorText: { color: colors.danger, fontFamily: font.sans, fontSize: 13, paddingBottom: 12 },

  stepRow: { flexDirection: 'row', gap: 12 },
  rail: { width: NODE, alignItems: 'center' },
  node: { width: NODE, height: NODE, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.success },
  nodeCurrent: { backgroundColor: colors.accent },
  nodeTodo: { borderWidth: 1.5, borderColor: colors.text3 },
  check: { color: colors.onAccent, fontSize: 12, fontFamily: font.sans800, lineHeight: 14 },
  connector: { width: 2, flex: 1, minHeight: 16, marginVertical: 2, borderRadius: 1 },
  connectorDone: { backgroundColor: colors.success },
  connectorTodo: { backgroundColor: colors.border },
  stepBody: { flex: 1, paddingBottom: 16 },
  stepLabel: { color: colors.text, fontFamily: font.sans700, fontSize: 15, lineHeight: NODE },
  stepLabelTodo: { color: colors.text3, fontFamily: font.sans600 },

  sectionEyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.3, marginBottom: 10 },
  requestRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingBottom: 12 },
  requestTextCol: { flex: 1, gap: 3 },
  requestKind: { color: colors.text, fontFamily: font.sans700, fontSize: 14 },
  requestMsg: { color: colors.text2, fontFamily: font.sans, fontSize: 13, lineHeight: 18 },
  requestDate: { color: colors.text3, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  requestStatus: { color: colors.text2, fontFamily: font.sans600, fontSize: 12, textAlign: 'right', maxWidth: 130 },

  footRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  foot: { flexShrink: 1, color: colors.text3, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },

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
  linkBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 2 },
  linkText: { color: colors.accent, fontFamily: font.sans600, fontSize: 13 },
})
