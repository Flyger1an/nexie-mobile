import { Platform } from 'react-native'
import type * as AppleAuthentication from 'expo-apple-authentication'

import { env } from './env'
import { supabase } from './supabase'

// Native social sign-in → Supabase session via signInWithIdToken. Both providers need a native
// rebuild + their Supabase provider configured; the buttons are gated (below) so they stay hidden
// until that's done. The native modules (expo-crypto / expo-apple-authentication / google-signin)
// are imported LAZILY inside the handlers — an EAGER top-level import crashes startup with
// "Cannot find native module" on any build that predates them, so importing this file (for the
// gating flags) must stay inert. Each function resolves `false` on user cancel, throws on real errors.

/** Apple is iOS-only and gated on the enable flag (set after configuring + rebuilding). */
export const isAppleSignInSupported = Platform.OS === 'ios' && env.appleSignInEnabled
/** Google appears once its web client id is configured. */
export const isGoogleSignInConfigured = Boolean(env.googleWebClientId)

export async function signInWithApple(): Promise<boolean> {
  const Crypto = await import('expo-crypto')
  const Apple = await import('expo-apple-authentication')

  // Apple binds a nonce into the identity token; Supabase re-hashes the RAW nonce and compares,
  // so Apple gets the SHA-256 hash and Supabase gets the raw value.
  const rawNonce = Crypto.randomUUID()
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce)

  let credential: AppleAuthentication.AppleAuthenticationCredential
  try {
    credential = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return false
    throw e
  }

  if (!credential.identityToken) throw new Error('Apple did not return an identity token.')
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  })
  if (error) throw error
  return true
}

let googleConfigured = false
async function ensureGoogleConfigured() {
  if (googleConfigured) return
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin')
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId || undefined,
  })
  googleConfigured = true
}

export async function signInWithGoogle(): Promise<boolean> {
  const { GoogleSignin, statusCodes } = await import('@react-native-google-signin/google-signin')
  await ensureGoogleConfigured()
  if (Platform.OS === 'android') await GoogleSignin.hasPlayServices()

  let response: Awaited<ReturnType<typeof GoogleSignin.signIn>>
  try {
    response = await GoogleSignin.signIn()
  } catch (e) {
    if ((e as { code?: string })?.code === statusCodes.SIGN_IN_CANCELLED) return false
    throw e
  }

  // Tolerate the response shape across SDK versions ({ type, data } vs the user object directly).
  const r = response as { type?: string; data?: { idToken?: string | null }; idToken?: string | null }
  if (r.type === 'cancelled') return false
  const idToken = r.data?.idToken ?? r.idToken
  if (!idToken) throw new Error('Google did not return an ID token.')

  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
  if (error) throw error
  return true
}
