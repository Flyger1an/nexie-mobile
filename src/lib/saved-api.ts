import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'

// Saved businesses (buyer facet). Authenticated; owner-scoped server-side via RLS.
const SAVED_URL = `${env.nexieApiUrl}/saved`

/** The authenticated buyer's saved business slugs (newest first). */
export async function fetchSavedSlugs(session: Session): Promise<string[]> {
  const res = await apiRequest<{ ok: boolean; saved: { slug: string; createdAt: string }[] }>(SAVED_URL, {
    method: 'GET',
    accessToken: session.access_token,
  })
  return (res.saved ?? []).map((s) => s.slug)
}

/** Save a business (idempotent server-side). */
export async function saveBusiness(session: Session, slug: string): Promise<void> {
  await apiRequest(SAVED_URL, { method: 'POST', accessToken: session.access_token, body: { slug } })
}

/** Un-save a business. */
export async function unsaveBusiness(session: Session, slug: string): Promise<void> {
  await apiRequest(SAVED_URL, { method: 'DELETE', accessToken: session.access_token, body: { slug } })
}
