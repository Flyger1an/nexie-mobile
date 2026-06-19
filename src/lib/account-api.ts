import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'

// nexieApiUrl is the agent base (…/api/agents/nexie); account deletion lives at the app root.
const DELETE_URL = `${env.nexieApiUrl.replace(/\/api\/agents\/nexie\/?$/, '')}/api/account/delete`

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
