import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { buttonGlass, cardShadow, colors, font, radius } from '@/lib/theme'
import type { NexieCatalogPage } from '@/lib/types'

type DiscoverCardProps = {
  page: NexieCatalogPage
  onAsk: (page: NexieCatalogPage) => void
  onView: (page: NexieCatalogPage) => void
}

function DiscoverCardBase({ page, onAsk, onView }: DiscoverCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {page.name}
        </Text>
        {page.certified ? (
          <View style={styles.certified}>
            <Text style={styles.certifiedText}>Certified</Text>
          </View>
        ) : null}
      </View>

      {page.location ? <Text style={styles.location}>{page.location}</Text> : null}

      {page.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {page.description}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <View style={styles.readyDot} />
          <Text style={styles.metaText}>{page.readiness}% ready</Text>
        </View>
        {page.offerCount > 0 ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>
              {page.offerCount} {page.offerCount === 1 ? 'offer' : 'offers'}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaChip}>
          <Text style={styles.metaText}>{page.currency}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[buttonGlass.base, styles.ask]}
          onPress={() => onAsk(page)}
          accessibilityRole="button"
          accessibilityLabel={`Ask Nexxi about ${page.name}`}
        >
          <Text style={[buttonGlass.label, styles.askText]}>Ask Nexxi</Text>
        </Pressable>
        <Pressable
          style={styles.view}
          onPress={() => onView(page)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${page.name} page`}
        >
          <Text style={styles.viewText}>View</Text>
        </Pressable>
      </View>
    </View>
  )
}

export const DiscoverCard = memo(DiscoverCardBase)

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopColor: colors.sheen,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 8,
    ...cardShadow,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 20,
    letterSpacing: -0.2,
  },
  certified: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  certifiedText: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  location: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  description: {
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  metaText: {
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 6,
  },
  ask: {
    flex: 1,
  },
  askText: {
    fontSize: 14,
  },
  view: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  viewText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 14,
  },
})
