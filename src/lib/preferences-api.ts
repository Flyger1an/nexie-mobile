import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'
import type { NexieAvailableSource, NexiePreferences } from './types'

const PREFERENCES_URL = `${env.nexieApiUrl}/preferences`

type PreferencesResponse = { ok: boolean; preferences: NexiePreferences; availableSources?: NexieAvailableSource[] }

export type PreferencesLoad = { preferences: NexiePreferences; availableSources: NexieAvailableSource[] }

/** The buyer's standing preferences + the search sources currently available (configured). */
export async function fetchPreferences(session: Session): Promise<PreferencesLoad> {
  const res = await apiRequest<PreferencesResponse>(PREFERENCES_URL, {
    method: 'GET',
    accessToken: session.access_token,
  })
  return { preferences: res.preferences, availableSources: res.availableSources ?? [] }
}

/** Replace the buyer's preferences. The server re-validates, so it returns the stored copy. */
export async function updatePreferences(
  session: Session,
  preferences: NexiePreferences,
): Promise<NexiePreferences> {
  const res = await apiRequest<PreferencesResponse>(PREFERENCES_URL, {
    method: 'PATCH',
    accessToken: session.access_token,
    body: { preferences },
  })
  return res.preferences
}
