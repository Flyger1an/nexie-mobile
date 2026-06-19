import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'

import { useAuth } from '@/context/auth'
import { captureError } from '@/lib/observability'
import { registerPushTokenForSession } from '@/lib/push-notifications'

type PushData = { type?: string; token?: string }

function routeFromResponse(
  router: ReturnType<typeof useRouter>,
  response: Notifications.NotificationResponse | null,
) {
  if (!response) return
  const data = response.notification.request.content.data as PushData | undefined
  // Orders + negotiations both live in the Orders tab; deep-link there.
  if (data?.type === 'order' || data?.type === 'negotiation') {
    router.navigate('/orders')
  }
}

/**
 * Headless bridge: registers this device's push token once per session and routes
 * notification taps (both cold-start and while running) into the app. Renders nothing.
 */
export function PushBridge() {
  const { session } = useAuth()
  const router = useRouter()
  const registeredFor = useRef<string | null>(null)

  // Register the push token once per signed-in user. Ref guard (not state) avoids any
  // effect render cascade; setState never happens here.
  useEffect(() => {
    if (!session || registeredFor.current === session.user.id) return
    registeredFor.current = session.user.id
    registerPushTokenForSession(session).catch((error) => {
      registeredFor.current = null // allow a retry on the next mount
      captureError(error, { scope: 'push-register' })
    })
  }, [session])

  // Handle taps: cold start (app launched from a notification) + while running.
  useEffect(() => {
    let mounted = true
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (mounted) routeFromResponse(router, response)
      })
      .catch(() => {})
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromResponse(router, response)
    })
    return () => {
      mounted = false
      sub.remove()
    }
  }, [router])

  return null
}
