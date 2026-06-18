import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'
import type { NexieOrdersResponse } from './types'

const ORDERS_URL = `${env.nexieApiUrl}/orders`

/** Fetch the authenticated buyer's order history (checkout orders + negotiations). */
export async function fetchNexieOrders(session: Session): Promise<NexieOrdersResponse> {
  // GET → the api-client retries idempotently on network/5xx.
  return apiRequest<NexieOrdersResponse>(ORDERS_URL, {
    method: 'GET',
    accessToken: session.access_token,
  })
}

/** Public buyer order-portal URL for a token (full status + recourse view). */
export function orderPortalUrl(token: string): string {
  let origin = 'https://app.nexez.ai'
  try {
    origin = new URL(env.nexieApiUrl).origin
  } catch {
    // fall back to the default origin
  }
  return `${origin}/orders/${encodeURIComponent(token)}`
}
