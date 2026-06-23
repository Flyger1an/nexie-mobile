import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'

// Standing searches the buyer wants alerts for (buyer facet). Authenticated; RLS owner-scoped server-side.
const URL = `${env.nexieApiUrl}/saved-searches`

export type SavedSearch = { id: string; query: string; category: string; createdAt: string }

export async function fetchSavedSearches(session: Session): Promise<SavedSearch[]> {
  const res = await apiRequest<{ ok: boolean; searches: SavedSearch[] }>(URL, {
    method: 'GET',
    accessToken: session.access_token,
  })
  return res.searches ?? []
}

/** Save a standing search (idempotent server-side). Needs at least one of query/category. */
export async function saveSearch(session: Session, input: { query?: string; category?: string }): Promise<void> {
  await apiRequest(URL, {
    method: 'POST',
    accessToken: session.access_token,
    body: { query: input.query ?? '', category: input.category ?? '' },
  })
}

export async function deleteSavedSearch(session: Session, id: string): Promise<void> {
  await apiRequest(URL, { method: 'DELETE', accessToken: session.access_token, body: { id } })
}
