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
