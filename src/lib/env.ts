export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  nexieApiUrl: process.env.EXPO_PUBLIC_NEXIE_API_URL ?? 'https://app.nexez.ai/api/agents/nexie',
}

export function assertEnv() {
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) {
    throw new Error(`Missing Nexie environment values: ${missing.join(', ')}`)
  }
}
