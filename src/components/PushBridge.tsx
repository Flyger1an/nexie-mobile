import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'

import { useAuth } from '@/context/auth'
import { captureError } from '@/lib/observability'
import { isOnboardingComplete } from '@/lib/onboarding'
import { registerPushTokenForSession } from '@/lib/push-notifications'

type PushData = { type?: string; token?: string; query?: string }

function routeFromResponse(
  router: ReturnType<typeof useRouter>,
  response: Notifications.NotificationResponse | null,
) {
  if (!response) return
  const data = response.notification.request.content.data as PushData | undefined
  // Orders + negotiations both live in the Orders tab; deep-link there.
  if (data?.type === 'order' || data?.type === 'negotiation') {
    router.navigate('/orders')
  } else if (data?.type === 'saved_search') {
    // Saved-search alert → open Discover prefiltered to the saved query.
    router.navigate({ pathname: '/discover', params: { q: data.query ?? '' } })
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
    // Don't request notification permission until the user is past onboarding — a brand-new
    // user is still in that flow, which requests it in-context on completion (avoids a
    // cold OS prompt mid-signup).
    isOnboardingComplete()
      .then((done) => {
        if (!done) {
          registeredFor.current = null // re-attempt next launch, once onboarded
          return
        }
        return registerPushTokenForSession(session)
      })
      .catch((error) => {
        registeredFor.current = null
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
