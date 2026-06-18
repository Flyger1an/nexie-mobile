import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radius } from '@/lib/theme'
import type { NexieCard } from '@/lib/types'

type ApprovalCardProps = {
  card: Extract<NexieCard, { type: 'approval' }>
  disabled?: boolean
  onDecision: (approvalId: string, decision: 'approved' | 'rejected') => void
}

export function ApprovalCard({ card, disabled, onDecision }: ApprovalCardProps) {
  const locked = disabled || card.status !== 'PENDING'

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Approval required</Text>
        <Text style={styles.status}>{card.status}</Text>
      </View>
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.summary}>{card.summary}</Text>

      <View style={styles.actions}>
        <Pressable
          disabled={locked}
          style={[styles.decline, locked ? styles.disabled : null]}
          onPress={() => onDecision(card.id, 'rejected')}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
        <Pressable
          disabled={locked}
          style={[styles.approve, locked ? styles.disabled : null]}
          onPress={() => onDecision(card.id, 'approved')}
        >
          <Text style={styles.approveText}>Approve</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.32)',
    backgroundColor: 'rgba(45,212,191,0.10)',
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: colors.signal,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  status: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  summary: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  approve: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.signal,
    paddingVertical: 13,
  },
  approveText: {
    color: '#001313',
    fontWeight: '900',
  },
  decline: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingVertical: 13,
  },
  declineText: {
    color: colors.text,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.48,
  },
})
