import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
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
import { useAuth } from '@/context/auth'
import { tapHaptic } from '@/lib/haptics'
import { catalogCategories, catalogSearchText, fetchCatalog } from '@/lib/discover-api'
import { getRecentSlugs } from '@/lib/recent'
import { saveSearch } from '@/lib/saved-searches-api'
import { colors, font, radius } from '@/lib/theme'
import type { NexieCatalogPage } from '@/lib/types'

export default function DiscoverScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const params = useLocalSearchParams()
  const [pages, setPages] = useState<NexieCatalogPage[]>([])
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [recentSlugs, setRecentSlugs] = useState<string[]>([])
  const [appliedQ, setAppliedQ] = useState<string | undefined>()
  const [savedSig, setSavedSig] = useState('')

  // Apply a deep-linked query (?q= from a saved-search alert) once per distinct value. Render-phase
  // setState is React's recommended alternative to an effect for syncing to a changed param.
  const seedQ = typeof params.q === 'string' ? params.q : Array.isArray(params.q) ? (params.q[0] ?? '') : ''
  if (seedQ && seedQ !== appliedQ) {
    setAppliedQ(seedQ)
    setQuery(seedQ)
    setActiveCategory(null)
  }

  // "Save this search" reflects the CURRENT query+category; saving stamps that signature.
  const curSig = `${query.trim().toLowerCase()}::${(activeCategory ?? '').toLowerCase()}`
  const hasSearch = Boolean(query.trim() || activeCategory)
  const searchSaved = hasSearch && savedSig === curSig

  const onSaveSearch = useCallback(async () => {
    if (!session || !hasSearch) return
    tapHaptic()
    setSavedSig(curSig) // optimistic
    try {
      await saveSearch(session, { query: query.trim(), category: activeCategory ?? '' })
    } catch {
      setSavedSig('')
    }
  }, [session, hasSearch, curSig, query, activeCategory])

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

  // Recently-viewed refreshes whenever the tab regains focus (it changes as the buyer opens detail pages).
  useFocusEffect(
    useCallback(() => {
      let active = true
      getRecentSlugs()
        .then((slugs) => {
          if (active) setRecentSlugs(slugs)
        })
        .catch(() => {})
      return () => {
        active = false
      }
    }, []),
  )

  const categories = useMemo(() => catalogCategories(pages), [pages])

  // Recently-viewed businesses resolved against the catalog; hidden while searching/filtering.
  const recentPages = useMemo(() => {
    if (query.trim() || activeCategory) return []
    const bySlug = new Map(pages.map((p) => [p.slug, p]))
    return recentSlugs
      .map((s) => bySlug.get(s))
      .filter((p): p is NexieCatalogPage => Boolean(p))
      .slice(0, 8)
  }, [recentSlugs, pages, query, activeCategory])

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

  // Open the native business detail screen (replaces bouncing to the web page). Pass the catalog
  // fields as params so the header renders instantly while offers + reviews load from agent.json.
  const viewPage = useCallback(
    (page: NexieCatalogPage) => {
      tapHaptic()
      router.navigate({
        pathname: '/business/[slug]',
        params: {
          slug: page.slug,
          name: page.name,
          location: page.location ?? '',
          description: page.description ?? '',
          readiness: String(page.readiness),
          certified: page.certified ? '1' : '',
          offerCount: String(page.offerCount),
          currency: page.currency,
          url: page.url,
          agentJsonUrl: page.agentJsonUrl,
        },
      })
    },
    [router],
  )

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

      {session && hasSearch ? (
        <View style={styles.saveSearchWrap}>
          <Pressable
            style={[styles.saveSearchBtn, searchSaved ? styles.saveSearchBtnDone : null]}
            onPress={onSaveSearch}
            disabled={searchSaved}
            accessibilityRole="button"
            accessibilityState={{ disabled: searchSaved }}
            accessibilityLabel={searchSaved ? 'Search saved — alerts on' : 'Save this search and get alerts'}
          >
            <Text style={[styles.saveSearchText, searchSaved ? styles.saveSearchTextDone : null]}>
              {searchSaved ? '✓ Saved — we’ll alert you' : '＋ Save this search'}
            </Text>
          </Pressable>
        </View>
      ) : null}

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
          ListHeaderComponent={
            recentPages.length ? (
              <View style={styles.recentWrap}>
                <Text style={styles.recentEyebrow}>RECENTLY VIEWED</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {recentPages.map((p) => (
                    <Pressable
                      key={p.slug}
                      style={styles.recentChip}
                      onPress={() => viewPage(p)}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${p.name}`}
                    >
                      <Text style={styles.recentChipText} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
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
  saveSearchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  saveSearchBtn: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  saveSearchBtnDone: {
    borderColor: colors.success,
    backgroundColor: 'rgba(201,168,103,0.14)',
  },
  saveSearchText: {
    color: colors.accent,
    fontFamily: font.sans700,
    fontSize: 12.5,
  },
  saveSearchTextDone: {
    color: colors.success,
  },
  search: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.sheen,
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
  recentWrap: {
    marginBottom: 14,
    gap: 8,
  },
  recentEyebrow: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  recentRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  recentChip: {
    maxWidth: 180,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.sheen,
    backgroundColor: colors.panel,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recentChipText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 12,
    flexGrow: 1,
  },
})
