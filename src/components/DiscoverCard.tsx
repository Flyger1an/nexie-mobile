import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius } from '@/lib/theme'
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
          style={styles.ask}
          onPress={() => onAsk(page)}
          accessibilityRole="button"
          accessibilityLabel={`Ask Nexie about ${page.name}`}
        >
          <Text style={styles.askText}>Ask Nexie</Text>
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
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 16,
    gap: 8,
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
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  certified: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.5)',
    backgroundColor: 'rgba(45,212,191,0.14)',
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  certifiedText: {
    color: colors.signal,
    fontSize: 11,
    fontWeight: '900',
  },
  location: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    color: colors.muted,
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.signal,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 6,
  },
  ask: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.signal,
    alignItems: 'center',
    paddingVertical: 12,
  },
  askText: {
    color: '#001313',
    fontSize: 14,
    fontWeight: '900',
  },
  view: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  viewText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
})
