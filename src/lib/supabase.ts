import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

import { env } from './env'

const memoryStorage = new Map<string, string>()

const serverSafeStorage = {
  async getItem(key: string) {
    return memoryStorage.get(key) ?? null
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value)
  },
  async removeItem(key: string) {
    memoryStorage.delete(key)
  },
}

const webStorage = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return serverSafeStorage.getItem(key)
    return window.localStorage.getItem(key)
  },
  async setItem(key: string, value: string) {
    if (typeof window === 'undefined') return serverSafeStorage.setItem(key, value)
    window.localStorage.setItem(key, value)
  },
  async removeItem(key: string) {
    if (typeof window === 'undefined') return serverSafeStorage.removeItem(key)
    window.localStorage.removeItem(key)
  },
}

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
