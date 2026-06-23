import { Pressable, StyleSheet, Text, View } from 'react-native'

import { decisionHaptic } from '@/lib/haptics'
import { buttonGlass, cardShadow, colors, font, radius } from '@/lib/theme'
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

      <View
        style={styles.trustRow}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.lock}>
          <View style={styles.lockShackle} />
          <View style={styles.lockBody} />
        </View>
        <Text style={styles.trustText}>SECURED BY STRIPE · YOU APPROVE EVERY CHARGE</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={`Decline: ${card.title}`}
          accessibilityState={{ disabled: locked }}
          style={[styles.decline, locked ? styles.disabled : null]}
          onPress={() => {
            decisionHaptic()
            onDecision(card.id, 'rejected')
          }}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
        <Pressable
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={`Approve: ${card.title}`}
          accessibilityState={{ disabled: locked }}
          style={[styles.approve, locked ? styles.disabled : null]}
          onPress={() => {
            decisionHaptic()
            onDecision(card.id, 'approved')
          }}
        >
          <Text style={styles.approveText}>
            <Text style={styles.approveCheck}>✓ </Text>
            Approve
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderTopColor: colors.sheen,
    backgroundColor: colors.accentSoft,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  status: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  summary: {
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  lock: {
    width: 10,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lockShackle: {
    width: 6,
    height: 6,
    borderColor: colors.success,
    borderWidth: 1.4,
    borderBottomWidth: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginBottom: -1,
  },
  lockBody: {
    width: 10,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
  trustText: {
    color: colors.success,
    fontFamily: font.mono,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  approve: {
    ...buttonGlass.base,
    ...buttonGlass.confirm,
    flex: 1,
    borderRadius: radius.md,
    ...cardShadow,
  },
  approveText: {
    ...buttonGlass.label,
    ...buttonGlass.confirmLabel,
    fontFamily: font.sans700,
    fontSize: 14,
  },
  approveCheck: {
    color: colors.confirmInk,
    fontFamily: font.sans700,
  },
  decline: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    paddingVertical: 13,
  },
  declineText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.48,
  },
})
