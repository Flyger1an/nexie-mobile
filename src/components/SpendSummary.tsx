import { StyleSheet, Text, View } from 'react-native'

import { formatMoney } from '@/lib/format'
import type { SpendSummary as Summary } from '@/lib/spend'
import { cardShadow, colors, font, glass, radius } from '@/lib/theme'

/**
 * Money-clarity header for the Orders tab: all-time committed spend, this-month spend, order count,
 * and — when the buyer set a per-order ceiling — a chip plus a note if any order went over it.
 * Renders nothing until there's committed spend to show.
 */
export function SpendSummary({ summary, ceiling }: { summary: Summary; ceiling: number | null }) {
  if (summary.orderCount === 0) return null

  const total = formatMoney(summary.spentCents, summary.currency)
  const month = formatMoney(summary.monthCents, summary.currency)
  const ceilingCents = ceiling != null && ceiling > 0 ? Math.round(ceiling * 100) : null
  const overCeiling = ceilingCents != null && summary.maxSingleCents > ceilingCents
  const ceilingLabel = ceilingCents != null ? formatMoney(ceilingCents, summary.currency) : null

  const notes: string[] = []
  if (summary.partiallyRefunded) notes.push('Totals are shown before partial refunds.')
  if (summary.otherCurrencyCount > 0) {
    notes.push(
      `${summary.otherCurrencyCount} ${summary.otherCurrencyCount === 1 ? 'order' : 'orders'} in another currency ${summary.otherCurrencyCount === 1 ? 'is' : 'are'} not included.`,
    )
  }

  return (
    <View
      style={styles.card}
      accessibilityLabel={`Spent so far, ${total}, across ${summary.orderCount} ${summary.orderCount === 1 ? 'order' : 'orders'}.`}
    >
      <Text style={styles.eyebrow}>SPENT SO FAR</Text>
      <Text style={styles.total}>{total}</Text>

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{month ?? formatMoney(0, summary.currency)}</Text>
          <Text style={styles.statLabel}>THIS MONTH</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.orderCount}</Text>
          <Text style={styles.statLabel}>{summary.orderCount === 1 ? 'ORDER' : 'ORDERS'}</Text>
        </View>
        {ceilingLabel ? (
          <>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{ceilingLabel}</Text>
              <Text style={styles.statLabel}>PER-ORDER CAP</Text>
            </View>
          </>
        ) : null}
      </View>

      {overCeiling ? (
        <Text style={styles.overNote}>One order went over your per-order ceiling — Nexxi confirmed it with you first.</Text>
      ) : null}
      {notes.length ? <Text style={styles.footnote}>{notes.join(' ')}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...glass,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
    ...cardShadow,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  total: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 34,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 14,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    color: colors.text,
    fontFamily: font.sans700,
    fontSize: 15,
  },
  statLabel: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 9,
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  overNote: {
    color: colors.amber,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  footnote: {
    color: colors.text3,
    fontFamily: font.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
})
