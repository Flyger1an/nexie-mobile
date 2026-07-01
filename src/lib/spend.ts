import type { NexieOrderSummary } from './types'

// Money clarity: derive a spend summary from the buyer's order list (which is complete — the orders
// endpoint applies no cap). "Committed" = the buyer's money is with the seller. We can't net out
// partial refunds client-side (the summary carries no refunded_cents), so partial_refund counts at
// full amount and the card footnotes that.

const COMMITTED_STATUSES = new Set(['paid', 'complete', 'completed', 'accepted', 'held', 'dispute_won'])
const PARTIAL_STATUSES = new Set(['partial_refund'])

function isCommitted(status: string): boolean {
  const s = (status || '').toLowerCase()
  return COMMITTED_STATUSES.has(s) || PARTIAL_STATUSES.has(s)
}

export type SpendSummary = {
  currency: string
  /** All-time committed spend (matching `currency`). */
  spentCents: number
  /** Committed spend in the current calendar month (matching `currency`). */
  monthCents: number
  /** Count of committed orders (matching `currency`). */
  orderCount: number
  /** Largest single committed order (matching `currency`) — for the per-order-ceiling check. */
  maxSingleCents: number
  /** Committed orders in a DIFFERENT currency, excluded from the totals above. */
  otherCurrencyCount: number
  /** True if any counted order was partially refunded (totals shown are pre-refund). */
  partiallyRefunded: boolean
}

function dominantCurrency(orders: NexieOrderSummary[]): string | null {
  const counts = new Map<string, number>()
  for (const o of orders) {
    const c = (o.currency || 'USD').toUpperCase()
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  let best: string | null = null
  let bestN = 0
  counts.forEach((n, c) => {
    if (n > bestN) {
      best = c
      bestN = n
    }
  })
  return best
}

/**
 * Summarize committed spend, in a single display currency: the budget's currency when set, else the
 * buyer's most common order currency. Orders in other currencies are counted separately (never summed
 * into a mixed total). `now` is injectable for testing/determinism.
 */
export function summarizeSpend(
  orders: NexieOrderSummary[],
  budgetCurrency?: string | null,
  now: Date = new Date(),
): SpendSummary {
  const committed = orders.filter((o) => isCommitted(o.status) && o.amountCents != null && o.amountCents > 0)
  const currency = (budgetCurrency && budgetCurrency.trim().toUpperCase()) || dominantCurrency(committed) || 'USD'

  const matching = committed.filter((o) => (o.currency || 'USD').toUpperCase() === currency)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  let spentCents = 0
  let monthCents = 0
  let maxSingleCents = 0
  let partiallyRefunded = false
  for (const o of matching) {
    const cents = o.amountCents ?? 0
    spentCents += cents
    if (cents > maxSingleCents) maxSingleCents = cents
    if (PARTIAL_STATUSES.has((o.status || '').toLowerCase())) partiallyRefunded = true
    const t = new Date(o.createdAt).getTime()
    if (!Number.isNaN(t) && t >= monthStart) monthCents += cents
  }

  return {
    currency,
    spentCents,
    monthCents,
    orderCount: matching.length,
    maxSingleCents,
    otherCurrencyCount: committed.length - matching.length,
    partiallyRefunded,
  }
}
