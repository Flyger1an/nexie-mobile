import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DiscoverCard } from '@/components/DiscoverCard'
import { tapHaptic } from '@/lib/haptics'
import { catalogSearchText, fetchCatalog } from '@/lib/discover-api'
import { colors, radius } from '@/lib/theme'
import type { NexieCatalogPage } from '@/lib/types'

export default function DiscoverScreen() {
  const router = useRouter()
  const [pages, setPages] = useState<NexieCatalogPage[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Shared loader for pull-to-refresh + retry (event handlers, not effects).
  const load = useCallback(async (): Promise<void> => {
    try {
      const result = await fetchCatalog()
      setPages(result)
      setError('')
    } catch {
      setError('Could not load the Nexez directory. Pull to refresh.')
    }
  }, [])

  // Initial load. setState lives in promise callbacks (never the synchronous effect
  // body), so it can't cascade renders.
  useEffect(() => {
    let active = true
    fetchCatalog()
      .then((result) => {
        if (active) {
          setPages(result)
          setError('')
        }
      })
      .catch(() => {
        if (active) setError('Could not load the Nexez directory. Pull to refresh.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pages
    return pages.filter((p) => catalogSearchText(p).includes(q))
  }, [pages, query])

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

  const askNexie = useCallback(
    (page: NexieCatalogPage) => {
      tapHaptic()
      const where = page.location ? ` in ${page.location}` : ''
      const seed = `Tell me about ${page.name}${where} and help me compare their offers.`
      router.navigate({ pathname: '/chat', params: { seed } })
    },
    [router],
  )

  const viewPage = useCallback((page: NexieCatalogPage) => {
    if (page.url) WebBrowser.openBrowserAsync(page.url).catch(() => {})
  }, [])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Discover</Text>
        <Text style={styles.title}>Agent-ready businesses</Text>
        <Text style={styles.subtitle}>Browse the Nexez directory, then ask Nexie to compare, negotiate, or book.</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, place, or service"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />
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
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <DiscoverCard page={item} onAsk={askNexie} onView={viewPage} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.signal} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>{query ? 'No matches' : 'Nothing here yet'}</Text>
              <Text style={styles.emptyBody}>
                {query
                  ? 'Try a different name, place, or service.'
                  : 'New agent-ready businesses will appear here as they publish.'}
              </Text>
            </View>
          }
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
    gap: 4,
  },
  kicker: {
    color: colors.signal,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
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
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  search: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
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
    flexGrow: 1,
  },
})
