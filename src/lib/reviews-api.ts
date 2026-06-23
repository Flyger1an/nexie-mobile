import { apiRequest } from './api-client'
import { env } from './env'

// Buyer reviews go to the public order-portal review endpoint at the app root (not the agent base).
// The order's portal TOKEN is the credential — no bearer needed.
const APP_BASE = env.nexieApiUrl.replace(/\/api\/agents\/nexie\/?$/, '')
const REVIEW_URL = `${APP_BASE}/api/order-portal/review`

// Mirrors nexez `canReviewOrderStatus` — only settled orders/deals can be reviewed.
const REVIEWABLE = new Set(['paid', 'complete', 'dispute_won'])
export function isReviewable(status: string): boolean {
  return REVIEWABLE.has((status || '').toLowerCase())
}

export type SubmittedReview = { id: string; rating: number; title: string | null; body: string | null }

/**
 * Submit a buyer review for an order/deal. The server requires a 1–5 integer rating and a note when
 * the rating is ≤ 2; it returns 409 if this order was already reviewed (surface that to the user).
 */
export async function submitReview(input: {
  token: string
  rating: number
  title?: string
  body?: string
}): Promise<SubmittedReview> {
  const res = await apiRequest<{ ok: boolean; review: SubmittedReview }>(REVIEW_URL, {
    method: 'POST',
    body: {
      token: input.token,
      rating: input.rating,
      title: input.title?.trim() || undefined,
      body: input.body?.trim() || undefined,
    },
  })
  return res.review
}
