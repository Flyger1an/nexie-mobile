import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { errorHaptic, successHaptic, tapHaptic } from '@/lib/haptics'
import { submitReview } from '@/lib/reviews-api'
import { buttonGlass, colors, font, glass, radius } from '@/lib/theme'

const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))

/**
 * Review composer — leave a 1–5 rating + optional note for a settled order/deal. Posts to the
 * order-portal review endpoint with the portal token (no bearer). Reached from Orders / the deal
 * screen for paid/complete items. The seller detail screen already DISPLAYS the resulting reviews.
 */
export default function ReviewScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const token = first(params.token)
  const offerName = first(params.offerName) || 'your order'
  const sellerName = first(params.sellerName)

  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // The server requires a note for low ratings; mirror it client-side so the button reflects it.
  const needsNote = rating > 0 && rating <= 2 && !body.trim()
  const canSubmit = rating >= 1 && !needsNote && !submitting && Boolean(token)

  async function onSubmit() {
    if (!canSubmit) return
    tapHaptic()
    setSubmitting(true)
    setError('')
    try {
      await submitReview({ token, rating, title, body })
      successHaptic()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your review. Try again.')
      errorHaptic()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.topTitle}>Review</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {done ? (
          <View style={styles.doneWrap}>
            <Text style={styles.doneStars}>{'★★★★★'.slice(0, rating)}</Text>
            <Text accessibilityRole="header" style={styles.doneTitle}>Thanks for your review</Text>
            <Text style={styles.doneBody}>Your feedback helps other buyers and the seller. It’ll appear on {sellerName || 'their'} page.</Text>
            <Pressable style={[buttonGlass.base, styles.primary]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={buttonGlass.label}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.eyebrow}>RATE YOUR EXPERIENCE</Text>
            <Text accessibilityRole="header" style={styles.title}>{offerName}</Text>
            {sellerName ? <Text style={styles.seller}>{sellerName}</Text> : null}

            <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={`Rating: ${rating} of 5 stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  hitSlop={6}
                  onPress={() => {
                    tapHaptic()
                    setRating(n)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
                >
                  <Text style={[styles.star, n <= rating ? styles.starOn : styles.starOff]}>{n <= rating ? '★' : '☆'}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formCard}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title (optional)"
                placeholderTextColor={colors.text3}
                maxLength={120}
                accessibilityLabel="Review title"
                style={styles.input}
              />
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder={needsNote ? 'Tell the seller what happened (required for low ratings)' : 'Share a few details (optional)'}
                placeholderTextColor={colors.text3}
                multiline
                maxLength={2000}
                accessibilityLabel="Review details"
                style={[styles.input, styles.bodyInput]}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[buttonGlass.base, styles.primary, !canSubmit ? buttonGlass.disabled : null]}
              disabled={!canSubmit}
              onPress={onSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              accessibilityLabel="Post review"
            >
              {submitting ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={[buttonGlass.label, !canSubmit ? buttonGlass.disabledLabel : null]}>Post review</Text>
              )}
            </Pressable>
            <Text style={styles.hint}>Posted publicly with your rating. One review per order.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.text, fontSize: 30, lineHeight: 32, marginTop: -2 },
  topTitle: { flex: 1, color: colors.text2, fontFamily: font.sans600, fontSize: 14, textAlign: 'center' },
  container: { paddingHorizontal: 18, paddingBottom: 40, gap: 12 },

  eyebrow: { color: colors.accent, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.4, marginTop: 4 },
  title: { color: colors.text, fontFamily: font.serif, fontSize: 26, lineHeight: 30, letterSpacing: -0.3 },
  seller: { color: colors.text2, fontFamily: font.sans, fontSize: 14 },

  stars: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 4 },
  star: { fontSize: 38, lineHeight: 44 },
  starOn: { color: colors.success },
  starOff: { color: colors.text3 },

  formCard: { ...glass, borderRadius: radius.lg, padding: 12, gap: 10 },
  input: {
    backgroundColor: colors.panel2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: font.sans,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bodyInput: { minHeight: 110, textAlignVertical: 'top' },

  error: { color: colors.danger, fontFamily: font.sans, fontSize: 13 },
  primary: { marginTop: 6 },
  hint: { color: colors.text3, fontFamily: font.sans, fontSize: 12, textAlign: 'center', marginTop: 2 },

  doneWrap: { alignItems: 'center', gap: 12, paddingTop: 48, paddingHorizontal: 12 },
  doneStars: { color: colors.success, fontSize: 30, letterSpacing: 2 },
  doneTitle: { color: colors.text, fontFamily: font.serif, fontSize: 26 },
  doneBody: { color: colors.text2, fontFamily: font.sans, fontSize: 14, lineHeight: 21, textAlign: 'center' },
})
