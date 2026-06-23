// Business detail data layer: one business's PUBLIC agent.json (the per-listing manifest).
//
// Unauthenticated, lives on the agent-runtime host, returns absolute URLs. Goes through the shared
// api-client purely for timeout + idempotent-GET retry + error classification; no bearer attached.
// The `page` block carries the business meta + rating_summary; `offers[]` carries the bookable items.

import { apiRequest } from './api-client'
import type { NexieBusinessDetail, NexieBusinessOffer, NexieRatingSummary } from './types'

type RawReview = { rating?: number; title?: string | null; body?: string | null; created_at?: string | null }
type RawRating = {
  average?: number
  count?: number
  verified_count?: number
  recent_reviews?: RawReview[]
} | null
type RawOffer = {
  key?: string
  name?: string
  description?: string | null
  price?: string | null
  accepts_negotiation?: boolean
}
type RawAgentJson = {
  page?: {
    name?: string
    slug?: string
    description?: string | null
    location?: string | null
    currency?: string
    url?: string
    contact_email?: string | null
    rating_summary?: RawRating
  }
  offers?: RawOffer[]
}

function normalizeRating(r: RawRating): NexieRatingSummary {
  if (!r || typeof r.average !== 'number' || !r.count) return null
  return {
    average: r.average,
    count: r.count,
    verifiedCount: typeof r.verified_count === 'number' ? r.verified_count : 0,
    recent: (r.recent_reviews ?? []).map((x) => ({
      rating: typeof x.rating === 'number' ? x.rating : 0,
      title: x.title?.trim() || null,
      body: x.body?.trim() || null,
      createdAt: x.created_at ?? null,
    })),
  }
}

/** Fetch + normalize one business's public detail (meta + rating + offers) from its agent.json. */
export async function fetchBusinessDetail(agentJsonUrl: string, signal?: AbortSignal): Promise<NexieBusinessDetail> {
  const data = await apiRequest<RawAgentJson>(agentJsonUrl, { method: 'GET', signal })
  const p = data.page ?? {}
  const offers: NexieBusinessOffer[] = (data.offers ?? [])
    .filter((o): o is RawOffer & { key: string; name: string } => Boolean(o?.key && o?.name))
    .map((o) => ({
      key: o.key,
      name: o.name,
      description: (o.description ?? '')?.trim() || null,
      price: o.price ?? null,
      acceptsNegotiation: Boolean(o.accepts_negotiation),
    }))
  return {
    name: p.name ?? '',
    slug: p.slug ?? '',
    description: (p.description ?? '').trim(),
    location: p.location?.trim() || null,
    currency: (p.currency ?? 'usd').toUpperCase(),
    url: p.url ?? '',
    contactEmail: p.contact_email ?? null,
    rating: normalizeRating(p.rating_summary ?? null),
    offers,
  }
}
