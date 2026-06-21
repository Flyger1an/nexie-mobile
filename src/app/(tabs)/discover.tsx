import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DiscoverCard } from '@/components/DiscoverCard'
import { tapHaptic } from '@/lib/haptics'
import { catalogCategories, catalogSearchText, fetchCatalog } from '@/lib/discover-api'
import { colors, font, radius } from '@/lib/theme'
import type { NexieCatalogPage } from '@/lib/types'

export default function DiscoverScreen() {
  const router = useRouter()
  const [pages, setPages] = useState<NexieCatalogPage[]>([])
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
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

  const categories = useMemo(() => catalogCategories(pages), [pages])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pages.filter((p) => {
      if (activeCategory && (p.industry ?? '').toLowerCase() !== activeCategory.toLowerCase()) return false
      if (q && !catalogSearchText(p).includes(q)) return false
      return true
    })
  }, [pages, query, activeCategory])

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
        <Text accessibilityRole="header" style={styles.title}>Agent-ready businesses</Text>
        <Text style={styles.subtitle}>Browse the Nexez directory, then ask Nexxi to compare, negotiate, or book.</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, place, or service"
          placeholderTextColor={colors.text3}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search businesses"
          style={styles.search}
        />
      </View>

      {categories.length > 0 ? (
        <View style={styles.chipsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            <CategoryChip label="All" active={!activeCategory} onPress={() => setActiveCategory(null)} />
            {categories.map((c) => (
              <CategoryChip key={c} label={c} active={activeCategory === c} onPress={() => setActiveCategory(c)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

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

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tapHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  chipsWrap: {
    paddingBottom: 4,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  chipText: {
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.onAccent,
    fontFamily: font.sans700,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 4,
  },
  kicker: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 28,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.text2,
    fontFamily: font.sans,
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
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: font.sans,
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
  emptyTitle: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  emptyBody: {
    color: colors.text2,
    fontFamily: font.sans,
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
