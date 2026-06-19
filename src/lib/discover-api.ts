// Discover tab data layer: the PUBLIC Nexez agent catalog (agent-pages.json).
//
// This is unauthenticated, lives on the agent-runtime host (NOT the app host), and
// already returns absolute URLs for each page / agent.json / checkout. We go through
// the shared api-client purely for its timeout + idempotent-GET retry + error
// classification; no bearer token is attached.

import { apiRequest } from './api-client'
import { env } from './env'
import type { NexieCatalogPage } from './types'

type RawCatalogPage = {
  name?: string
  slug?: string
  url?: string
  agent_json_url?: string
  description?: string | null
  location?: string | null
  currency?: string
  readiness?: number
  certified?: boolean
  offer_count?: number
}

type RawCatalog = { pages?: RawCatalogPage[] }

/** Fetch + normalize the public catalog. Pages missing a slug are skipped (unroutable). */
export async function fetchCatalog(signal?: AbortSignal): Promise<NexieCatalogPage[]> {
  const data = await apiRequest<RawCatalog>(env.catalogUrl, { method: 'GET', signal })
  return (data.pages ?? [])
    .filter((p): p is RawCatalogPage & { name: string; slug: string } => Boolean(p?.name && p?.slug))
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      url: p.url ?? '',
      agentJsonUrl: p.agent_json_url ?? '',
      description: (p.description ?? '').trim(),
      location: p.location?.trim() || null,
      currency: (p.currency ?? 'usd').toUpperCase(),
      readiness: typeof p.readiness === 'number' ? p.readiness : 0,
      certified: Boolean(p.certified),
      offerCount: typeof p.offer_count === 'number' ? p.offer_count : 0,
    }))
}

/** Lower-cased haystack for the client-side Discover search box. */
export function catalogSearchText(page: NexieCatalogPage): string {
  return `${page.name} ${page.location ?? ''} ${page.description}`.toLowerCase()
}
