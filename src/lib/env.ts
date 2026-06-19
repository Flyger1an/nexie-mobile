// Public runtime config. EXPO_PUBLIC_* values are inlined into the JS bundle, so
// only non-secret values belong here (the Supabase anon/publishable key + URLs).
// Never put a service-role key or any secret in an EXPO_PUBLIC_* var.

const required = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  nexieApiUrl: process.env.EXPO_PUBLIC_NEXIE_API_URL ?? 'https://app.nexez.ai/api/agents/nexie',
}

export const env = {
  ...required,
  // Optional: when set, the observability seam initializes Sentry. Empty = no-op.
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  // Google Sign-In OAuth client IDs (optional). When the web client id is set, the Google button
  // appears and GoogleSignin is configured; empty = the button stays hidden. The iOS client id is
  // also needed on iOS. (The iOS reversed-client-id URL scheme is wired separately in app.config.js
  // via EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME.)
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  // Sign in with Apple needs a native rebuild + the Supabase Apple provider; gate the button on
  // this flag so it stays hidden until both are in place (set 'true' after configuring + rebuilding).
  appleSignInEnabled: process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true',
  // Public Nexez agent catalog (agent-pages.json) — the Discover tab's data source.
  // Lives on the agent-runtime host, NOT the app host; overridable for staging.
  catalogUrl: process.env.EXPO_PUBLIC_NEXEZ_CATALOG_URL || 'https://nexez.app/agent-pages.json',
}

/** Required env keys that are currently empty. Non-throwing, for the startup gate UI. */
export function getMissingEnv(): string[] {
  return Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)
}

/** Fail loud when required config is missing. */
export function assertEnv() {
  const missing = getMissingEnv()
  if (missing.length) {
    throw new Error(`Missing Nexie environment values: ${missing.join(', ')}`)
  }
}
