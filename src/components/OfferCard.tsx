import * as WebBrowser from 'expo-web-browser'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius } from '@/lib/theme'
import type { NexieCard } from '@/lib/types'

type OfferCardProps = {
  card: Extract<NexieCard, { type: 'page_result' }>
  onAskToBook: (prompt: string) => void
  onAskToNegotiate: (prompt: string) => void
}

export function OfferCard({ card, onAskToBook, onAskToNegotiate }: OfferCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.mark}>
          <Text style={styles.markText}>N</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.subline}>/{card.slug} · {card.subtitle}</Text>
        </View>
        {card.price ? <Text style={styles.price}>{card.price}</Text> : null}
      </View>

      {card.description ? <Text style={styles.description}>{card.description}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={() => WebBrowser.openBrowserAsync(card.url)}>
          <Text style={styles.secondaryText}>View</Text>
        </Pressable>
        {card.offerKey ? (
          <>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => onAskToNegotiate(`Negotiate ${card.offerName || card.title} on /${card.slug} using offer ${card.offerKey}.`)}
            >
              <Text style={styles.secondaryText}>Negotiate</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={() => onAskToBook(`Book ${card.offerName || card.title} on /${card.slug} using offer ${card.offerKey}.`)}
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
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,212,191,0.16)',
  },
  markText: {
    color: colors.signal,
    fontWeight: '900',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subline: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 3,
  },
  price: {
    color: colors.signal,
    fontSize: 12,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: colors.signal,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryText: {
    color: '#001313',
    fontWeight: '900',
    fontSize: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
})
