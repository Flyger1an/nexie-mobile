import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { OrderCard } from '@/components/OrderCard'
import { useAuth } from '@/context/auth'
import { fetchNexieOrders, orderPortalUrl } from '@/lib/orders-api'
import { colors } from '@/lib/theme'
import type { NexieOrderSummary } from '@/lib/types'

export default function OrdersScreen() {
  // The tabs layout guarantees a session before this renders, but keep the guard
  // for type-narrowing and a clean no-op if it ever changes mid-session.
  const { session } = useAuth()
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

  function openOrder(token: string) {
    WebBrowser.openBrowserAsync(orderPortalUrl(token)).catch(() => {})
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Everything Nexie booked or negotiated for you.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.signal} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={onRetry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyBody}>
            When you book or negotiate with Nexie, your orders and their status appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => `${item.kind}:${item.token}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <OrderCard order={item} onOpen={openOrder} />}
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
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  subtitle: {
    color: colors.muted,
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
    fontSize: 14,
    textAlign: 'center',
  },
  retry: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
  },
})
