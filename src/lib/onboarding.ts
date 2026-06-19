import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// First-run flag. Non-sensitive, but we already use SecureStore everywhere (no
// AsyncStorage dep), with a localStorage fallback for the web dev build.
const KEY = 'nexxi.onboarded.v1'

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) === '1'
    return (await SecureStore.getItemAsync(KEY)) === '1'
  } catch {
    return false
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(KEY, '1')
      return
    }
    await SecureStore.setItemAsync(KEY, '1')
  } catch {
    // Best-effort: worst case onboarding shows again next launch.
  }
}
