import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

import { env } from './env'

/**
 * Supabase session persistence.
 *
 * Native (iOS/Android): the session (access + refresh tokens) lives in the OS
 * keychain/keystore via expo-secure-store — never plaintext on disk. SecureStore
 * has historically rejected values above ~2048 bytes on iOS, and a Supabase
 * session JSON (JWT + refresh token + user object) routinely exceeds that, so we
 * transparently split values into byte-bounded chunks and reassemble them on read.
 *
 * Web: keep window.localStorage with an SSR-safe in-memory fallback (Expo web can
 * render server-side / before hydration).
 */

const SECURE_CHUNK_BYTES = 1800 // safely under the ~2048-byte iOS keychain ceiling
const chunkKey = (key: string, index: number) => `${key}.${index}`
const metaKey = (key: string) => `${key}.__nx_chunks`

/** UTF-8 byte length of a single code point (no TextEncoder dependency). */
function codePointByteLength(codePoint: number): number {
  if (codePoint <= 0x7f) return 1
  if (codePoint <= 0x7ff) return 2
  if (codePoint <= 0xffff) return 3
  return 4
}

/** Split on code-point boundaries so a multi-byte char is never cut in half. */
function chunkByBytes(value: string, maxBytes: number): string[] {
  const chunks: string[] = []
  let current = ''
  let currentBytes = 0
  for (const char of value) {
    const charBytes = codePointByteLength(char.codePointAt(0) ?? 0)
    if (current && currentBytes + charBytes > maxBytes) {
      chunks.push(current)
      current = ''
      currentBytes = 0
    }
    current += char
    currentBytes += charBytes
  }
  if (current) chunks.push(current)
  return chunks
}

async function removeSecureChunks(key: string) {
  const countRaw = await SecureStore.getItemAsync(metaKey(key))
  const count = countRaw ? Number(countRaw) : 0
  const deletions: Promise<void>[] = [SecureStore.deleteItemAsync(metaKey(key))]
  for (let i = 0; i < count; i += 1) {
    deletions.push(SecureStore.deleteItemAsync(chunkKey(key, i)))
  }
  await Promise.all(deletions)
}

const secureStorage = {
  async getItem(key: string) {
    const countRaw = await SecureStore.getItemAsync(metaKey(key))
    if (countRaw == null) return null
    const count = Number(countRaw)
    if (!Number.isFinite(count) || count <= 0) return null

    const parts: string[] = []
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i))
      if (part == null) return null // partial/corrupt write → treat as no session
      parts.push(part)
    }
    return parts.join('')
  },
  async setItem(key: string, value: string) {
    await removeSecureChunks(key) // clear any prior (possibly longer) chunk set first
    const chunks = chunkByBytes(value, SECURE_CHUNK_BYTES)
    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i])
    }
    await SecureStore.setItemAsync(metaKey(key), String(chunks.length))
  },
  async removeItem(key: string) {
    await removeSecureChunks(key)
  },
}

const memoryStore = new Map<string, string>()

const webStorage = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return memoryStore.get(key) ?? null
    return window.localStorage.getItem(key)
  },
  async setItem(key: string, value: string) {
    if (typeof window === 'undefined') {
      memoryStore.set(key, value)
      return
    }
    window.localStorage.setItem(key, value)
  },
  async removeItem(key: string) {
    if (typeof window === 'undefined') {
      memoryStore.delete(key)
      return
    }
    window.localStorage.removeItem(key)
  },
}

const storage = Platform.OS === 'web' ? webStorage : secureStorage

// Fall back to placeholders so a misconfigured build doesn't throw at import time
// (supabase-js rejects an empty URL). The startup env gate in the root layout
// blocks the app before any request is made, so the placeholder is never used.
export const supabase = createClient(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabasePublishableKey || 'placeholder-anon-key',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
