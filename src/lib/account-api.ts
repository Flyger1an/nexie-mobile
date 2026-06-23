import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'

// nexieApiUrl is the agent base (…/api/agents/nexie); account endpoints live at the app root.
const APP_BASE = env.nexieApiUrl.replace(/\/api\/agents\/nexie\/?$/, '')
const DELETE_URL = `${APP_BASE}/api/account/delete`
const EXPORT_URL = `${APP_BASE}/api/account/export`

/**
 * Delete the signed-in user's NEXXI BUYER data. The server targets the session user only;
 * `confirm: true` is the required intent flag. Always sign out + route to the entry screen after.
 *
 * Returns `sellerRetained`: when the same login also sells on Nexez, the buyer data is cleared but
 * the seller account + login are KEPT (deleting the buyer app never destroys a seller's business),
 * so the UI should message that rather than "your account is gone".
 */
export async function deleteAccount(session: Session): Promise<{ sellerRetained: boolean }> {
  const res = await apiRequest<{ ok: boolean; sellerRetained?: boolean }>(DELETE_URL, {
    method: 'POST',
    accessToken: session.access_token,
    body: { confirm: true },
  })
  return { sellerRetained: Boolean(res.sellerRetained) }
}

export type AccountExport = {
  account: { id: string; email: string | null; exportedAt: string }
  data: Record<string, unknown[]>
}

/**
 * Fetch the signed-in user's personal data (GDPR/CCPA) as a pretty-printed JSON string, ready to
 * hand to the OS share sheet so the user can save or send it. Targets the session user only.
 */
export async function exportAccount(session: Session): Promise<string> {
  const result = await apiRequest<AccountExport>(EXPORT_URL, {
    method: 'GET',
    accessToken: session.access_token,
  })
  return JSON.stringify(result, null, 2)
}
