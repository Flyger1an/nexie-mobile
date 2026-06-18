import type { Session } from '@supabase/supabase-js'

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
  const response = await fetch(env.nexieApiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.session.access_token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      message: input.message,
      threadId: input.threadId,
      mode: input.mode ?? 'text',
      approval: input.approval ?? null,
    }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json.error || 'Nexie could not complete that turn.')
  }

  return json
}
