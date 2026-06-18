import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'
import type { NexieMode, NexieTurnResponse } from './types'

type SendTurnInput = {
  session: Session
  message?: string
  threadId?: string
  mode?: NexieMode
  approval?: {
    id: string
    decision: 'approved' | 'rejected'
  }
}

export async function sendNexieTurn(input: SendTurnInput): Promise<NexieTurnResponse> {
  // POST with retries:0 (the client default for non-GET) — a turn can create an
  // approval or execute a booking/negotiation, so a blind retry could duplicate it.
  return apiRequest<NexieTurnResponse>(env.nexieApiUrl, {
    method: 'POST',
    accessToken: input.session.access_token,
    body: {
      message: input.message,
      threadId: input.threadId,
      mode: input.mode ?? 'text',
      approval: input.approval ?? null,
    },
  })
}
