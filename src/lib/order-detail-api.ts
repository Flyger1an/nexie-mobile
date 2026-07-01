import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'
import type { NexieOrderDetail } from './types'

// Full receipt/detail for one of the buyer's orders. Authed + account-bound server-side (the order's
// buyer_email must match the caller's confirmed account email), so this only ever returns the buyer's
// own orders — the portal token alone isn't enough here.
export async function fetchOrderDetail(session: Session, token: string): Promise<NexieOrderDetail> {
  const res = await apiRequest<{ ok: boolean; order: NexieOrderDetail }>(
    `${env.nexieApiUrl}/orders/${encodeURIComponent(token)}`,
    { method: 'GET', accessToken: session.access_token },
  )
  return res.order
}
