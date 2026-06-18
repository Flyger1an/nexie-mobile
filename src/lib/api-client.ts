// Centralized fetch client for the Nexie backend.
//
// Responsibilities: bearer-auth injection, per-request timeout (combined with any
// caller AbortSignal), typed error classification, and idempotency-aware retries.
//
// Retry policy: GETs are assumed idempotent and retried with backoff on
// network/timeout/5xx. Non-GET requests are NOT auto-retried by default — a Nexie
// turn can create an approval or execute a booking/negotiation, and a blind retry
// after a lost response could duplicate that side effect. Callers that know a POST
// is safe to repeat can opt in via `retries`.

import { captureError } from './observability'

export type NexieErrorCode =
  | 'auth_required'
  | 'rate_limited'
  | 'bad_request'
  | 'server'
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'unknown'

export class NexieApiError extends Error {
  code: NexieErrorCode
  status?: number
  detail?: string

  constructor(code: NexieErrorCode, message: string, opts: { status?: number; detail?: string } = {}) {
    super(message)
    this.name = 'NexieApiError'
    this.code = code
    this.status = opts.status
    this.detail = opts.detail
  }
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  accessToken?: string
  signal?: AbortSignal
  /** Per-attempt timeout in ms. */
  timeoutMs?: number
  /** Extra retry attempts after the first. Defaults: GET → 2, others → 0. */
  retries?: number
}

const DEFAULT_TIMEOUT_MS = 30_000

function combineSignals(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  let didTimeout = false

  const onExternalAbort = () => controller.abort(external?.reason)
  if (external) {
    if (external.aborted) controller.abort(external.reason)
    else external.addEventListener('abort', onExternalAbort)
  }

  const timer = setTimeout(() => {
    didTimeout = true
    controller.abort(new Error('timeout'))
  }, timeoutMs)

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onExternalAbort)
    },
  }
}

function mapHttpError(status: number, payload: Record<string, unknown>): NexieApiError {
  const message = typeof payload.error === 'string' ? payload.error : `Request failed (HTTP ${status}).`
  const detail = typeof payload.detail === 'string' ? payload.detail : undefined
  if (status === 401 || status === 403 || payload.code === 'auth_required') {
    return new NexieApiError('auth_required', message || 'Sign in to use Nexie.', { status, detail })
  }
  if (status === 429) return new NexieApiError('rate_limited', message || 'Slow down a moment and try again.', { status, detail })
  if (status >= 500) return new NexieApiError('server', message || 'Nexie hit a server error.', { status, detail })
  if (status >= 400) return new NexieApiError('bad_request', message, { status, detail })
  return new NexieApiError('unknown', message, { status, detail })
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const isRetryable = (error: NexieApiError) =>
  error.code === 'network' || error.code === 'timeout' || error.code === 'server'

export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options
  const retries = options.retries ?? (method === 'GET' ? 2 : 0)

  let attempt = 0
  let lastError: NexieApiError = new NexieApiError('unknown', 'Request failed.')

  while (attempt <= retries) {
    const { signal: combined, didTimeout, cleanup } = combineSignals(signal, timeoutMs)
    try {
      const response = await fetch(url, {
        method,
        headers: {
          accept: 'application/json',
          ...(body != null ? { 'content-type': 'application/json' } : {}),
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: combined,
      })

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) throw mapHttpError(response.status, payload)
      return payload as T
    } catch (raw) {
      lastError = classifyThrown(raw, didTimeout(), signal?.aborted ?? false)

      // A caller-initiated cancel is final — never retry, never report.
      if (lastError.code === 'canceled') throw lastError

      const canRetry = attempt < retries && isRetryable(lastError)
      if (!canRetry) {
        if (lastError.code === 'server' || lastError.code === 'network') {
          captureError(lastError, { url, method, status: lastError.status })
        }
        throw lastError
      }
    } finally {
      cleanup()
    }

    attempt += 1
    await delay(Math.min(2_000, 300 * 2 ** (attempt - 1))) // 300ms, 600ms, capped at 2s
  }

  throw lastError
}

function classifyThrown(raw: unknown, didTimeout: boolean, externalAborted: boolean): NexieApiError {
  if (raw instanceof NexieApiError) return raw
  if (externalAborted) return new NexieApiError('canceled', 'Request canceled.')
  if (didTimeout) return new NexieApiError('timeout', 'Nexie took too long to respond. Try again.')
  // fetch throws a TypeError for network/DNS/connection failures in RN.
  const message = raw instanceof Error ? raw.message : 'Network request failed.'
  return new NexieApiError('network', 'Could not reach Nexie. Check your connection.', { detail: message })
}
