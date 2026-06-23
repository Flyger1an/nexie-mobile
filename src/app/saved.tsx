import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DiscoverCard } from '@/components/DiscoverCard'
import { useAuth } from '@/context/auth'
import { fetchCatalog } from '@/lib/discover-api'
import { tapHaptic } from '@/lib/haptics'
import { fetchSavedSlugs } from '@/lib/saved-api'
import { colors, font, radius } from '@/lib/theme'
import type { NexieCatalogPage } from '@/lib/types'

/**
 * Saved businesses — the buyer's saved slugs resolved against the public catalog (so a saved
 * business that later unpublishes simply drops off). Reached from Profile. Cards reuse the Discover
 * card (Ask Nexxi seeds the chat; View opens the native detail).
 */
export default function SavedScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [items, setItems] = useState<NexieCatalogPage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [slugs, catalog] = await Promise.all([fetchSavedSlugs(session), fetchCatalog()])
      const bySlug = new Map(catalog.map((p) => [p.slug, p]))
      // Preserve saved order (slugs come newest-first); drop saves no longer in the catalog.
      setItems(slugs.map((s) => bySlug.get(s)).filter((p): p is NexieCatalogPage => Boolean(p)))
      setError('')
    } catch {
      setError('Could not load your saved businesses.')
    }
  }, [session])

  // Initial load — inlined so every setState lives in a promise callback (not the effect body).
  useEffect(() => {
    if (!session) return
    let active = true
    Promise.all([fetchSavedSlugs(session), fetchCatalog()])
      .then(([slugs, catalog]) => {
        if (!active) return
        const bySlug = new Map(catalog.map((p) => [p.slug, p]))
        setItems(slugs.map((s) => bySlug.get(s)).filter((p): p is NexieCatalogPage => Boolean(p)))
        setError('')
      })
      .catch(() => {
        if (active) setError('Could not load your saved businesses.')
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

  const askNexie = useCallback(
    (page: NexieCatalogPage) => {
      tapHaptic()
      const where = page.location ? ` in ${page.location}` : ''
      router.navigate({ pathname: '/chat', params: { seed: `Tell me about ${page.name}${where} and help me compare their offers.` } })
    },
    [router],
  )

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>Saved</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyHeart}>♡</Text>
          </View>
          <Text style={styles.emptyTitle}>No saved businesses yet</Text>
          <Text style={styles.emptyBody}>Tap the heart on a business to keep it here for later.</Text>
          <Pressable style={styles.discoverBtn} onPress={() => router.navigate('/discover')} accessibilityRole="button" accessibilityLabel="Discover businesses">
            <Text style={styles.discoverText}>Discover businesses</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <DiscoverCard page={item} onAsk={askNexie} onView={viewPage} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.eyebrow}>SAVED</Text>
              <Text accessibilityRole="header" style={styles.title}>Saved businesses</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },
  topTitle: { flex: 1, color: colors.text2, fontFamily: font.sans600, fontSize: 14, textAlign: 'center' },

  list: { paddingHorizontal: 18, paddingBottom: 32, gap: 12 },
  header: { gap: 4, marginBottom: 8 },
  eyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: font.serif, fontSize: 30, lineHeight: 32, letterSpacing: -0.3 },
  error: { color: colors.danger, fontFamily: font.sans, fontSize: 13, marginTop: 6 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyCircle: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeart: { color: colors.text3, fontSize: 30, lineHeight: 34 },
  emptyTitle: { color: colors.text, fontFamily: font.serif, fontSize: 22 },
  emptyBody: { color: colors.text2, fontFamily: font.sans, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  discoverBtn: {
    marginTop: 6,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  discoverText: { color: colors.onAccent, fontFamily: font.sans700, fontSize: 14 },
})
