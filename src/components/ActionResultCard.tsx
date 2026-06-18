import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius } from '@/lib/theme'
import type { NexieCard } from '@/lib/types'

export function ActionResultCard({ card }: { card: Extract<NexieCard, { type: 'action_result' }> }) {
  const ok = card.status === 'success'

  return (
    <View style={[styles.card, ok ? styles.ok : styles.error]}>
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.description}>{card.description}</Text>
      {card.url ? (
        <Pressable style={styles.button} onPress={() => Linking.openURL(card.url!)}>
          <Text style={styles.buttonText}>Open secure link</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  ok: {
    borderColor: 'rgba(52,211,153,0.28)',
    backgroundColor: 'rgba(52,211,153,0.10)',
  },
  error: {
    borderColor: 'rgba(251,113,133,0.28)',
    backgroundColor: 'rgba(251,113,133,0.10)',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.signal,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  buttonText: {
    color: '#001313',
    fontWeight: '900',
    fontSize: 12,
  },
})
