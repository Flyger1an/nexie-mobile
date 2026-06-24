import type { Session } from '@supabase/supabase-js'

import { apiRequest } from './api-client'
import { env } from './env'

// Standing "agent tasks" Nexxi keeps working on in the background (buyer facet). Authenticated; RLS
// owner-scoped server-side. Results NOTIFY only — money never moves without in-app approval.
const URL = `${env.nexieApiUrl}/tasks`

export type AgentTask = {
  id: string
  prompt: string
  query: string
  category: string
  status: 'active' | 'paused'
  createdAt: string
}

export async function fetchTasks(session: Session): Promise<AgentTask[]> {
  const res = await apiRequest<{ ok: boolean; tasks: AgentTask[] }>(URL, {
    method: 'GET',
    accessToken: session.access_token,
  })
  return res.tasks ?? []
}

/** Create a standing task. `prompt` is the buyer's words; query/category refine the match. */
export async function createTask(
  session: Session,
  input: { prompt: string; query?: string; category?: string },
): Promise<void> {
  await apiRequest(URL, {
    method: 'POST',
    accessToken: session.access_token,
    body: { prompt: input.prompt, query: input.query ?? '', category: input.category ?? '' },
  })
}

export async function setTaskStatus(session: Session, id: string, status: 'active' | 'paused'): Promise<void> {
  await apiRequest(URL, { method: 'PATCH', accessToken: session.access_token, body: { id, status } })
}

export async function deleteTask(session: Session, id: string): Promise<void> {
  await apiRequest(URL, { method: 'DELETE', accessToken: session.access_token, body: { id } })
}
