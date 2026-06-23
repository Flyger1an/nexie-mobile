// Shared display formatters (money + dates + label casing) for buyer-facing screens.

/** Format a smallest-unit amount + ISO currency to a localized money string (e.g. "$2,500.00"). */
export function formatMoney(amountCents: number | null, currency: string): string | null {
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

/** Short, locale-aware date (e.g. "Jun 18, 2026"); null on a bad/empty value. */
export function formatShortDate(iso: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "agreement_proposed" → "Agreement proposed". */
export function titleize(s: string): string {
  const t = (s || '').replace(/_/g, ' ')
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}
