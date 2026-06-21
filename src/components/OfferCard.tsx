import * as WebBrowser from 'expo-web-browser'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { cardShadow, colors, font, radius } from '@/lib/theme'
import type { NexieCard } from '@/lib/types'

type OfferCardProps = {
  card: Extract<NexieCard, { type: 'page_result' }>
  /** Submit a booking/negotiation turn directly (produces an approval card to confirm). */
  onBook: (message: string) => void
  onNegotiate: (message: string) => void
  disabled?: boolean
}

export function OfferCard({ card, onBook, onNegotiate, disabled }: OfferCardProps) {
  // External (discovery-only) results carry a non-Nexez source — no offerKey, so they show View only.
  const external = !!card.source && card.source.id !== 'nexez'
  return (
    <View style={styles.card}>
      <View
        style={styles.topRule}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.header}>
        <View
          style={[styles.mark, external ? styles.markExternal : null]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.markText, external ? styles.markTextExternal : null]}>
            {external ? card.source!.label.charAt(0).toUpperCase() : 'N'}
          </Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.subline}>
            {external ? `via ${card.source!.label} · discovery` : `/${card.slug} · ${card.subtitle}`}
          </Text>
        </View>
        {card.price ? <Text style={styles.price}>{card.price}</Text> : null}
      </View>

      {card.description ? <Text style={styles.description}>{card.description}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${card.title}`}
          style={styles.secondaryButton}
          onPress={() => WebBrowser.openBrowserAsync(card.url)}
        >
          <Text style={styles.secondaryText}>View</Text>
        </Pressable>
        {card.offerKey ? (
          <>
            <Pressable
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Negotiate ${card.offerName || card.title}`}
              style={[styles.secondaryButton, disabled ? styles.disabled : null]}
              onPress={() => onNegotiate(`Negotiate ${card.offerName || card.title} on /${card.slug} using offer ${card.offerKey}.`)}
            >
              <Text style={styles.secondaryText}>Negotiate</Text>
            </Pressable>
            <Pressable
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Book ${card.offerName || card.title}`}
              style={[styles.primaryButton, disabled ? styles.disabled : null]}
              onPress={() => onBook(`Book ${card.offerName || card.title} on /${card.slug} using offer ${card.offerKey}.`)}
            >
              <Text style={styles.primaryText}>Book</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: 16,
    paddingTop: 18,
    gap: 12,
    overflow: 'hidden',
    ...cardShadow,
  },
  topRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  markText: {
    color: colors.onAccent,
    fontFamily: font.serif,
    fontSize: 20,
  },
  markExternal: {
    backgroundColor: colors.panel2,
  },
  markTextExternal: {
    color: colors.text2,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  subline: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 11,
    marginTop: 3,
  },
  price: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 18,
  },
  description: {
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryText: {
    color: colors.onAccent,
    fontFamily: font.sans700,
    fontSize: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 12,
  },
  disabled: {
    opacity: 0.45,
  },
})
