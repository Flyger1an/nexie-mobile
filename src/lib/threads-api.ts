import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'
import type { NexieMessage, NexieThreadSummary } from './types'

const THREADS_URL = `${env.nexieApiUrl}/threads`

/** The buyer's recent conversations (ACTIVE, newest first). */
export async function fetchThreads(session: Session): Promise<NexieThreadSummary[]> {
  const res = await apiRequest<{ ok: boolean; threads: NexieThreadSummary[] }>(THREADS_URL, {
    method: 'GET',
    accessToken: session.access_token,
  })
  return res.threads ?? []
}

export type NexieThreadDetail = { threadId: string; title: string; messages: NexieMessage[] }

/** A single conversation's messages, ready to resume in the chat. */
export async function fetchThreadMessages(session: Session, id: string): Promise<NexieThreadDetail> {
  const res = await apiRequest<{ ok: boolean; threadId: string; title: string; messages: NexieMessage[] }>(
    `${THREADS_URL}/${encodeURIComponent(id)}`,
    { method: 'GET', accessToken: session.access_token },
  )
  return { threadId: res.threadId, title: res.title, messages: res.messages ?? [] }
}

export async function renameThread(session: Session, id: string, title: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`${THREADS_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    accessToken: session.access_token,
    body: { title },
  })
}

export async function archiveThread(session: Session, id: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`${THREADS_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    accessToken: session.access_token,
    body: { archived: true },
  })
}
