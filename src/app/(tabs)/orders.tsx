import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { OrderCard } from '@/components/OrderCard'
import { useAuth } from '@/context/auth'
import { fetchNexieOrders, orderPortalUrl } from '@/lib/orders-api'
import { colors, font, radius } from '@/lib/theme'
import type { NexieOrderSummary } from '@/lib/types'

export default function OrdersScreen() {
  // The tabs layout guarantees a session before this renders, but keep the guard
  // for type-narrowing and a clean no-op if it ever changes mid-session.
  const { session } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<NexieOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Shared fetch for pull-to-refresh + retry (event handlers, not effects).
  const load = useCallback(async (): Promise<void> => {
    if (!session) return
    try {
      const result = await fetchNexieOrders(session)
      setOrders(result.orders ?? [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your orders.')
    }
  }, [session])

  // Initial load. The fetch is inlined and every setState lives inside a promise
  // callback (never the synchronous effect body), so it can't cascade renders.
  useEffect(() => {
    if (!session) return
    let active = true
    fetchNexieOrders(session)
      .then((result) => {
        if (!active) return
        setOrders(result.orders ?? [])
        setError('')
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load your orders.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [session])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const onRetry = useCallback(async () => {
    setLoading(true)
    await load()
    setLoading(false)
  }, [load])

  function openOrder(order: NexieOrderSummary) {
    // Negotiations → the native deal screen (status timeline + agent-gated actions). Direct-checkout
    // orders → the web portal (refund/report recourse lives there).
    if (order.kind === 'negotiation') {
      router.navigate({
        pathname: '/deal/[token]',
        params: {
          token: order.token,
          status: order.status,
          offerName: order.offerName ?? '',
          amountCents: order.amountCents == null ? '' : String(order.amountCents),
          currency: order.currency,
          sellerName: order.sellerName ?? '',
          slug: order.slug ?? '',
          createdAt: order.createdAt,
        },
      })
      return
    }
    WebBrowser.openBrowserAsync(orderPortalUrl(order.token)).catch(() => {})
  }

  function openReview(order: NexieOrderSummary) {
    router.navigate({
      pathname: '/review/[token]',
      params: {
        token: order.token,
        offerName: order.offerName ?? '',
        sellerName: order.sellerName ?? (order.slug ? `/${order.slug}` : ''),
      },
    })
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Everything Nexxi booked or negotiated for you.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.signal} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Try again" style={styles.retry} onPress={onRetry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.emptyGlyphRing}>
            <View style={styles.receipt}>
              <View style={styles.receiptLine} />
              <View style={[styles.receiptLine, styles.receiptLineShort]} />
              <View style={styles.receiptLine} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyBody}>
            When you book or negotiate with Nexxi, your orders and their status appear here.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discover businesses"
            style={({ pressed }) => [styles.discoverBtn, pressed ? styles.discoverBtnPressed : null]}
            onPress={() => router.navigate('/discover')}
          >
            <Text style={styles.discoverBtnText}>Discover businesses</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => `${item.kind}:${item.token}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <OrderCard order={item} onOpen={openOrder} onReview={openReview} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.signal} />}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 34,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    color: colors.danger,
    fontFamily: font.sans,
    fontSize: 14,
    textAlign: 'center',
  },
  retry: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 13,
  },
  emptyGlyphRing: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  receipt: {
    width: 28,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.text3,
    paddingHorizontal: 5,
    paddingVertical: 7,
    gap: 4,
    justifyContent: 'center',
  },
  receiptLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.text3,
  },
  receiptLineShort: {
    width: '60%',
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  emptyBody: {
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  discoverBtn: {
    marginTop: 8,
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  discoverBtnPressed: {
    opacity: 0.85,
  },
  discoverBtnText: {
    color: colors.onAccent,
    fontFamily: font.sans600,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
})
