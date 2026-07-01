export type NexieMode = 'text' | 'voice'

export type NexieCard =
  | {
      type: 'page_result'
      id: string
      title: string
      subtitle: string
      description: string | null
      price: string | null
      slug: string
      url: string
      agentJsonUrl: string
      offerKey: string | null
      offerName: string | null
      checkoutUrl: string | null
      score: number
      /** Which source surfaced this. Absent/`nexez` = bookable marketplace; others are discovery-only. */
      source?: { id: string; label: string }
    }
  | {
      type: 'approval'
      id: string
      status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED'
      toolName: 'initiate_negotiation' | 'trigger_booking'
      title: string
      summary: string
      payload: Record<string, unknown>
    }
  | {
      type: 'action_result'
      id: string
      title: string
      status: 'success' | 'error'
      description: string
      url?: string
      metadata?: Record<string, unknown>
    }

export type NexieMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  cards?: NexieCard[]
}

export type NexieTurnResponse = {
  ok: boolean
  threadId: string
  agentId: string
  message: string
  cards: NexieCard[]
  suggestions: string[]
  toolsUsed: string[]
  memory: Record<string, unknown>
  model: {
    configured: boolean
    provider: string
    name: string
  }
}

// Mirrors the backend BuyerOrderSummary returned by GET /api/agents/nexie/orders.
export type NexieOrderSummary = {
  kind: 'checkout' | 'negotiation'
  token: string
  offerName: string | null
  amountCents: number | null
  currency: string
  status: string
  sellerName: string | null
  slug: string | null
  createdAt: string
}

export type NexieOrdersResponse = {
  ok: boolean
  orders: NexieOrderSummary[]
}

// Full receipt/detail for one order — GET /api/agents/nexie/orders/[token]. Status copy, timeline,
// and request labels are computed server-side (shared with the web portal), so the app just renders.
export type NexieStatusTone = 'positive' | 'neutral' | 'warning' | 'pending'

export type NexieTimelineStep = { key: string; label: string; done: boolean; current: boolean }

export type NexieOrderRequest = {
  id: string
  kind: string
  kindLabel: string
  status: string
  statusLabel: string
  message: string | null
  createdAt: string
}

export type NexieOrderDetail = {
  kind: 'checkout' | 'negotiation'
  token: string
  reference: string
  offerName: string | null
  amountCents: number | null
  currency: string
  status: string
  statusLabel: string
  statusTone: NexieStatusTone
  statusDescription: string
  sellerName: string | null
  slug: string | null
  createdAt: string
  timeline: NexieTimelineStep[]
  requests: NexieOrderRequest[]
  canRequestRefund: boolean
  canReview: boolean
}

// Buyer "standing preferences" — mirrors the nexez NexiePreferences shape (the agent
// reads these every turn; the server is the source of truth + validator).
export type NexieTiming = 'flexible' | 'this_week' | 'asap'

export type NexiePreferences = {
  budgetMax: number | null
  currency: string
  categories: string[]
  timing: NexieTiming | null
  location: string | null
  voiceRepliesDefault: boolean
  notificationsEnabled: boolean
  /** Enabled search sources by id. null = all available; [] = Nexez only. Nexez is always searched. */
  sources: string[] | null
}

// A search source the buyer can toggle (from GET /preferences). `core` (Nexez) is always on.
export type NexieAvailableSource = {
  id: string
  label: string
  core: boolean
}

// A single business in the public Nexez agent catalog (agent-pages.json), normalized
// from snake_case. Drives the Discover tab.
export type NexieCatalogPage = {
  name: string
  slug: string
  url: string
  agentJsonUrl: string
  description: string
  location: string | null
  industry: string | null
  currency: string
  readiness: number
  certified: boolean
  offerCount: number
}

// A buyer review surfaced on a business detail screen (from the page's agent.json rating_summary).
export type NexieReview = {
  rating: number
  title: string | null
  body: string | null
  createdAt: string | null
}

// Aggregate rating for a business (null when there are no reviews yet).
export type NexieRatingSummary = {
  average: number
  count: number
  verifiedCount: number
  recent: NexieReview[]
} | null

// One bookable/negotiable offer on a business detail screen.
export type NexieBusinessOffer = {
  key: string
  name: string
  description: string | null
  price: string | null
  acceptsNegotiation: boolean
}

// Full public detail for one business, normalized from its /<slug>/agent.json payload.
export type NexieBusinessDetail = {
  name: string
  slug: string
  description: string
  location: string | null
  currency: string
  url: string
  contactEmail: string | null
  rating: NexieRatingSummary
  offers: NexieBusinessOffer[]
}

// A past conversation in the buyer's thread history (newest first).
export type NexieThreadSummary = {
  id: string
  title: string
  updatedAt: string
}
