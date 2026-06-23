import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { fetchBusinessDetail } from '@/lib/business-api'
import { fetchSavedSlugs, saveBusiness, unsaveBusiness } from '@/lib/saved-api'
import { tapHaptic } from '@/lib/haptics'
import { buttonGlass, cardShadow, colors, font, glass, radius } from '@/lib/theme'
import type { NexieBusinessDetail } from '@/lib/types'

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))
const stars = (avg: number): string => {
  const full = Math.max(0, Math.min(5, Math.round(avg)))
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full)
}

/**
 * Business detail — a native profile for one Nexez business (replaces bouncing to the web page).
 * Header/meta render instantly from the catalog params passed by Discover; offers + reviews load
 * from the page's public agent.json. Money actions seed the chat so they flow through the agent's
 * approval gate (no new checkout path here).
 */
export default function BusinessDetailScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const params = useLocalSearchParams()
  const slug = first(params.slug)
  const agentJsonUrl = first(params.agentJsonUrl)
  const paramName = first(params.name)
  const paramLocation = first(params.location) || null
  const paramDescription = first(params.description)
  const readiness = Number(first(params.readiness)) || 0
  const certified = first(params.certified) === '1'
  const paramOfferCount = Number(first(params.offerCount)) || 0
  const webUrl = first(params.url)

  const [detail, setDetail] = useState<NexieBusinessDetail | null>(null)
  // Start loading only when there's something to fetch (avoids a synchronous setState in the effect).
  const [loading, setLoading] = useState(Boolean(agentJsonUrl))
  const [error, setError] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (!agentJsonUrl) return
    let active = true
    const controller = new AbortController()
    fetchBusinessDetail(agentJsonUrl, controller.signal)
      .then((d) => {
        if (active) setDetail(d)
      })
      .catch(() => {
        if (active) setError('Could not load this business right now.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [agentJsonUrl])

  // Reflect whether this business is already saved (best-effort; setState stays in the callback).
  useEffect(() => {
    if (!session || !slug) return
    let active = true
    fetchSavedSlugs(session)
      .then((slugs) => {
        if (active) setIsSaved(slugs.includes(slug))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [session, slug])

  const description = detail?.description || paramDescription
  const rating = detail?.rating ?? null
  const offers = detail?.offers ?? []
  // Prefer the catalog params (instant header) but fall back to the fetched agent.json — keeps the
  // screen correct even when reached without the full param set (e.g. a deep link).
  const name = paramName || detail?.name || ''
  const location = paramLocation || detail?.location || null
  const offerCount = paramOfferCount || offers.length
  const monogram = (name.trim()[0] ?? 'N').toUpperCase()
  const where = location ? ` in ${location}` : ''

  const seedChat = (seed: string) => {
    tapHaptic()
    router.navigate({ pathname: '/chat', params: { seed } })
  }

  const toggleSaved = () => {
    if (!session || !slug) return
    tapHaptic()
    const next = !isSaved
    setIsSaved(next) // optimistic
    const op = next ? saveBusiness(session, slug) : unsaveBusiness(session, slug)
    op.catch(() => setIsSaved(!next)) // revert on failure
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>{name}</Text>
        {session ? (
          <Pressable
            onPress={toggleSaved}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            accessibilityLabel={isSaved ? 'Remove from saved' : 'Save business'}
            style={styles.backBtn}
          >
            <Text style={[styles.saveGlyph, isSaved ? styles.saveGlyphOn : null]}>{isSaved ? '♥' : '♡'}</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.heroRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{monogram}</Text>
          </View>
          <View style={styles.heroText}>
            <Text accessibilityRole="header" style={styles.name}>{name}</Text>
            <View style={styles.metaRow}>
              {certified ? (
                <View style={styles.certChip}>
                  <Text style={styles.certText}>CERTIFIED</Text>
                </View>
              ) : null}
              {location ? <Text style={styles.location}>{location.toUpperCase()}</Text> : null}
            </View>
          </View>
        </View>

        {rating ? (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStars}>{stars(rating.average)}</Text>
            <Text style={styles.ratingValue}>{rating.average.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>· {rating.count} review{rating.count === 1 ? '' : 's'}</Text>
          </View>
        ) : (
          <Text style={styles.noRating}>No reviews yet</Text>
        )}

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <View style={styles.readyDot} />
            <Text style={styles.chipText}>{readiness}% ready</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{offerCount} offer{offerCount === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {description ? <Text style={styles.description}>{description}</Text> : null}

        <Text style={styles.eyebrow}>OFFERS</Text>
        {loading && !offers.length ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : offers.length ? (
          offers.map((o) => (
            <View key={o.key} style={styles.offerCard}>
              <View style={styles.offerHead}>
                <Text style={styles.offerName}>{o.name}</Text>
                {o.price ? <Text style={styles.offerPrice}>{o.price}</Text> : null}
              </View>
              {o.description ? <Text style={styles.offerDesc}>{o.description}</Text> : null}
              <View style={styles.offerActions}>
                {o.acceptsNegotiation ? (
                  <Pressable
                    style={styles.ghostBtn}
                    onPress={() => seedChat(`Negotiate the ${o.name} with ${name}.`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Negotiate ${o.name}`}
                  >
                    <Text style={styles.ghostBtnText}>Negotiate</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[buttonGlass.base, styles.bookBtn]}
                  onPress={() => seedChat(`Book the ${o.name} from ${name}.`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Book ${o.name}`}
                >
                  <Text style={buttonGlass.label}>Book</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No offers listed yet.</Text>
        )}

        {rating && rating.recent.length ? (
          <>
            <Text style={styles.eyebrow}>REVIEWS</Text>
            {rating.recent.map((r, i) => (
              <View key={i} style={styles.reviewCard}>
                <Text style={styles.reviewStars}>{stars(r.rating)}</Text>
                {r.title ? <Text style={styles.reviewTitle}>{r.title}</Text> : null}
                {r.body ? <Text style={styles.reviewBody}>{r.body}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[buttonGlass.base, styles.primary]}
          onPress={() => seedChat(`Tell me about ${name}${where} and help me compare their offers.`)}
          accessibilityRole="button"
          accessibilityLabel="Ask Nexxi about this business"
        >
          <Text style={buttonGlass.label}>Ask Nexxi about this</Text>
        </Pressable>
        {webUrl ? (
          <Pressable
            style={styles.webBtn}
            onPress={() => {
              tapHaptic()
              WebBrowser.openBrowserAsync(webUrl).catch(() => {})
            }}
            accessibilityRole="button"
            accessibilityLabel="Open page on the web"
          >
            <Text style={styles.webBtnText}>View page on web</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },
  saveGlyph: { color: colors.text2, fontSize: 22, lineHeight: 24 },
  saveGlyphOn: { color: colors.accent },
  topTitle: { flex: 1, color: colors.text2, fontFamily: font.sans600, fontSize: 14, textAlign: 'center' },
  container: { paddingHorizontal: 18, paddingBottom: 40, gap: 14 },

  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 4 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: colors.onAccent, fontFamily: font.serif, fontSize: 26 },
  heroText: { flex: 1, gap: 6 },
  name: { color: colors.text, fontFamily: font.serif, fontSize: 28, lineHeight: 30, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  certChip: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  certText: { color: colors.accent, fontFamily: font.mono, fontSize: 9.5, letterSpacing: 1.2 },
  location: { color: colors.text3, fontFamily: font.mono, fontSize: 10, letterSpacing: 1 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingStars: { color: colors.success, fontSize: 14, letterSpacing: 1 },
  ratingValue: { color: colors.text, fontFamily: font.serif, fontSize: 18 },
  ratingCount: { color: colors.text3, fontFamily: font.sans, fontSize: 13 },
  noRating: { color: colors.text3, fontFamily: font.sans, fontSize: 13 },

  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  readyDot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
  chipText: { color: colors.text2, fontFamily: font.sans, fontSize: 12 },

  description: { color: colors.text2, fontFamily: font.sans, fontSize: 14.5, lineHeight: 22 },

  eyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4, marginTop: 8 },
  loading: { paddingVertical: 24, alignItems: 'center' },
  empty: { color: colors.text3, fontFamily: font.sans, fontSize: 14 },

  offerCard: {
    ...glass,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
    ...cardShadow,
  },
  offerHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  offerName: { flex: 1, color: colors.text, fontFamily: font.serif, fontSize: 17, lineHeight: 21 },
  offerPrice: { color: colors.text, fontFamily: font.serif, fontSize: 18 },
  offerDesc: { color: colors.text2, fontFamily: font.sans, fontSize: 13.5, lineHeight: 20 },
  offerActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { color: colors.text, fontFamily: font.sans700, fontSize: 14 },
  bookBtn: { flex: 1, minHeight: 44 },

  reviewCard: { ...glass, borderRadius: radius.lg, padding: 14, gap: 6 },
  reviewStars: { color: colors.success, fontSize: 13, letterSpacing: 1 },
  reviewTitle: { color: colors.text, fontFamily: font.sans700, fontSize: 14 },
  reviewBody: { color: colors.text2, fontFamily: font.sans, fontSize: 13.5, lineHeight: 20 },

  error: { color: colors.danger, fontFamily: font.sans, fontSize: 13 },

  primary: { marginTop: 10 },
  webBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBtnText: { color: colors.text, fontFamily: font.sans700, fontSize: 14 },
})
