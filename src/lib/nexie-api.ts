import type { Session } from '@supabase/supabase-js'
// expo/fetch (NOT global fetch) exposes a streaming response.body — required for SSE.
import { fetch as streamingFetch } from 'expo/fetch'

import { apiRequest, NexieApiError } from './api-client'
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

type StreamCallbacks = {
  /** Fired for each token delta as the reply generates. */
  onToken?: (delta: string) => void
}

/**
 * Streaming twin of {@link sendNexieTurn} against POST /api/agents/nexie/stream. Tokens flow to
 * `onToken` as the model generates; the resolved value comes from the AUTHORITATIVE `done` event
 * (full turn result — message/cards/threadId), so callers should render `done.message` as final
 * and treat the streamed tokens as a progressive preview. Throws a NexieApiError on HTTP/stream
 * failure or a server `error` event, matching sendNexieTurn's error contract.
 */
export async function streamNexieTurn(input: SendTurnInput, cb: StreamCallbacks = {}): Promise<NexieTurnResponse> {
  const url = `${env.nexieApiUrl}/stream`
  let res: Awaited<ReturnType<typeof streamingFetch>>
  try {
    res = await streamingFetch(url, {
      method: 'POST',
      headers: {
        accept: 'text/event-stream',
        'content-type': 'application/json',
        authorization: `Bearer ${input.session.access_token}`,
      },
      body: JSON.stringify({
        message: input.message,
        threadId: input.threadId,
        mode: input.mode ?? 'text',
        approval: input.approval ?? null,
      }),
    })
  } catch (raw) {
    throw new NexieApiError('network', 'Could not reach Nexxi. Check your connection.', {
      detail: raw instanceof Error ? raw.message : undefined,
    })
  }

  if (!res.ok || !res.body) {
    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const message = typeof payload.error === 'string' ? payload.error : `Request failed (HTTP ${res.status}).`
    const code = res.status === 401 || res.status === 403 ? 'auth_required' : res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server' : 'bad_request'
    throw new NexieApiError(code, message, { status: res.status })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let final: NexieTurnResponse | null = null
  let serverError: string | null = null

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE events are separated by a blank line.
    let sep: number
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep).trim()
      buffer = buffer.slice(sep + 2)
      if (!block.startsWith('data:')) continue
      let event: { type?: string; value?: string; error?: string } & Partial<NexieTurnResponse>
      try {
        event = JSON.parse(block.slice(5).trim())
      } catch {
        continue
      }
      if (event.type === 'token' && typeof event.value === 'string') cb.onToken?.(event.value)
      else if (event.type === 'done') final = event as NexieTurnResponse
      else if (event.type === 'error') serverError = typeof event.error === 'string' ? event.error : 'Nexxi hit a snag.'
    }
  }

  if (serverError) throw new NexieApiError('server', serverError)
  if (!final) throw new NexieApiError('server', 'Nexxi ended the response unexpectedly.')
  return final
}
