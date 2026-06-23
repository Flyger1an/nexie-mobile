import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Recently-viewed businesses (slugs, newest first). Local + non-sensitive; we mirror the app's
// SecureStore pattern (see lib/onboarding.ts) with a web localStorage fallback. Display meta is
// resolved against the public catalog at render time, so we only persist slugs.
const KEY = 'nexxi.recent.v1'
const CAP = 12

async function read(): Promise<string[]> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

async function write(slugs: string[]): Promise<void> {
  try {
    const val = JSON.stringify(slugs.slice(0, CAP))
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, val)
    else await SecureStore.setItemAsync(KEY, val)
  } catch {
    // best-effort: recently-viewed is a convenience, never block on it
  }
}

/** Record a viewed business (moves it to the front; deduped; capped). Fire-and-forget. */
export async function recordRecent(slug: string): Promise<void> {
  if (!slug) return
  const current = await read()
  await write([slug, ...current.filter((s) => s !== slug)])
}

/** The buyer's recently-viewed business slugs, newest first. */
export async function getRecentSlugs(): Promise<string[]> {
  return read()
}
