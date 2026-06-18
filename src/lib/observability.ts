// Thin observability seam.
//
// Routes app-wide error/message reporting through Sentry when
// EXPO_PUBLIC_SENTRY_DSN is set, and is a console-backed no-op otherwise (so local
// dev without a DSN stays quiet and CI/builds don't need one). The rest of the app
// only ever imports captureError / captureMessage / withObservability — Sentry
// specifics stay contained here.
//
// Follow-up for readable stack traces: add { organization, project } to the
// `@sentry/react-native` config plugin in app.json and set SENTRY_AUTH_TOKEN as an
// EAS secret so source maps upload during EAS builds.

import * as Sentry from '@sentry/react-native'
import type { ComponentType } from 'react'

import { env } from './env'

type Context = Record<string, unknown>

const observabilityEnabled = Boolean(env.sentryDsn)
let initialized = false

export function initObservability() {
  if (initialized) return
  initialized = true

  if (!observabilityEnabled) {
    if (__DEV__) console.log('[observability] no DSN set — error reporting is local-only')
    return
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    // Modest tracing in production; full sampling in dev. Tune during perf work.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  })
}

export function captureError(error: unknown, context?: Context) {
  const normalized = error instanceof Error ? error : new Error(String(error))

  if (__DEV__) console.error('[observability] captureError', normalized, context ?? {})
  if (!observabilityEnabled) return

  Sentry.captureException(normalized, context ? { extra: context } : undefined)
}

export function captureMessage(message: string, context?: Context) {
  if (__DEV__) console.warn('[observability] captureMessage', message, context ?? {})
  if (!observabilityEnabled) return

  Sentry.captureMessage(message, context ? { extra: context } : undefined)
}

/**
 * Wrap the root component for Sentry instrumentation (touch events, navigation,
 * time-to-display). No-op passthrough until a DSN is configured.
 */
export function withObservability<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return observabilityEnabled ? Sentry.wrap(Component) : Component
}
