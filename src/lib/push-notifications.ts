import type { Session } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { apiRequest } from './api-client'
import { env } from './env'

const PUSH_TOKEN_URL = `${env.nexieApiUrl}/push-token`

// Foreground behavior: show a banner + list entry and play a sound when a push
// arrives while the app is open. (SDK 56 uses shouldShowBanner/shouldShowList — the
// old shouldShowAlert is deprecated.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function resolveProjectId(): string | undefined {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  const fromEasConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  return fromExpoConfig ?? fromEasConfig
}

/**
 * Request permission, fetch the Expo push token, and register it with the backend.
 * Safe to call repeatedly (the backend upserts). No-ops on simulators (no real token)
 * or when permission isn't granted. May throw on network failure — callers should catch.
 */
export async function registerPushTokenForSession(session: Session): Promise<{ registered: boolean }> {
  // iOS Simulators can't obtain a push token (no APNs). Android emulators CAN (FCM via
  // Google Play services), so only skip iOS non-devices — real iOS/Android devices and
  // Android emulators all proceed.
  if (Platform.OS === 'ios' && !Device.isDevice) return { registered: false }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Nexxi',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  // Priming: only prompt if the OS will actually ask (don't re-nag after a denial).
  const existing = await Notifications.getPermissionsAsync()
  let granted = existing.granted
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync()
    granted = requested.granted
  }
  if (!granted) return { registered: false }

  const projectId = resolveProjectId()
  if (!projectId) return { registered: false }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId })
  const token = tokenResult.data
  if (!token) return { registered: false }

  await apiRequest<{ ok: boolean }>(PUSH_TOKEN_URL, {
    method: 'POST',
    accessToken: session.access_token,
    body: {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? undefined,
    },
  })

  return { registered: true }
}
