import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, font, radius } from '@/lib/theme'
import type { NexieOrderSummary } from '@/lib/types'

type StatusTone = 'success' | 'warn' | 'danger' | 'neutral'

// Outlined chip per status semantics: Paid → success (green), In progress → neutral ink (text2),
// Refunded/warning → amber, failed → danger. Border + text take the tone; fill stays transparent.
const toneColor: Record<StatusTone, string> = {
  success: colors.success,
  warn: colors.amber,
  danger: colors.danger,
  neutral: colors.text2,
}

function statusInfo(status: string): { label: string; tone: StatusTone } {
  const s = (status || '').toLowerCase()
  if (s === 'paid' || s === 'complete' || s === 'completed' || s === 'accepted') return { label: titleize(s), tone: 'success' }
  if (s === 'partial_refund') return { label: 'Partially refunded', tone: 'warn' }
  if (s === 'refunded' || s === 'disputed') return { label: titleize(s), tone: 'warn' }
  if (s === 'failed' || s === 'canceled' || s === 'cancelled' || s === 'declined') return { label: titleize(s), tone: 'danger' }
  if (s === 'negotiation' || s === 'pending') return { label: 'In progress', tone: 'neutral' }
  return { label: s ? titleize(s) : 'Unknown', tone: 'neutral' }
}

function titleize(s: string): string {
  const t = s.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function formatAmount(amountCents: number | null, currency: string): string | null {
  if (amountCents == null) return null
  const code = (currency || 'usd').toUpperCase()
  try {
    const fmt = new Intl.NumberFormat('en', { style: 'currency', currency: code })
    const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2
    return fmt.format(amountCents / Math.pow(10, digits))
  } catch {
    return `${code} ${(amountCents / 100).toFixed(2)}`
  }
}

function formatDate(iso: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function OrderCard({ order, onOpen }: { order: NexieOrderSummary; onOpen: (token: string) => void }) {
  const amount = formatAmount(order.amountCents, order.currency)
  const status = statusInfo(order.status)
  const date = formatDate(order.createdAt)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.kind === 'negotiation' ? 'Negotiation' : 'Order'}: ${order.offerName || order.slug || 'order'}, ${status.label}. Tap to view.`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      onPress={() => onOpen(order.token)}
    >
      <View style={styles.topRow}>
        <Text style={styles.kind}>{order.kind === 'negotiation' ? 'Negotiation' : 'Order'}</Text>
        <View style={[styles.statusPill, { borderColor: toneColor[status.tone] }]}>
          <Text style={[styles.statusText, { color: toneColor[status.tone] }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {order.offerName || order.slug || 'Order'}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.seller} numberOfLines={1}>
          {order.sellerName || (order.slug ? `/${order.slug}` : 'Nexez seller')}
        </Text>
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>{date ?? ''}</Text>
        <Text style={styles.link}>View →</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kind: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  statusText: {
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 19,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  seller: {
    flex: 1,
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 13,
  },
  amount: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  date: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  link: {
    color: colors.accent,
    fontFamily: font.sans600,
    fontSize: 12,
  },
})
