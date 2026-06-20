import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'

// nexieApiUrl is the agent base (…/api/agents/nexie); account endpoints live at the app root.
const APP_BASE = env.nexieApiUrl.replace(/\/api\/agents\/nexie\/?$/, '')
const DELETE_URL = `${APP_BASE}/api/account/delete`
const EXPORT_URL = `${APP_BASE}/api/account/export`

/**
 * Permanently delete the signed-in user's account + all associated data. The server targets the
 * session user only; `confirm: true` is the required intent flag. After this resolves the session
 * is invalid — callers must sign out + route to the entry screen.
 */
export async function deleteAccount(session: Session): Promise<void> {
  await apiRequest<{ ok: boolean }>(DELETE_URL, {
    method: 'POST',
    accessToken: session.access_token,
    body: { confirm: true },
  })
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
