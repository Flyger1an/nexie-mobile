import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import * as AppleAuthentication from 'expo-apple-authentication'

import { useAuth } from '@/context/auth'
import { isOnboardingComplete } from '@/lib/onboarding'
import { isAppleSignInSupported, isGoogleSignInConfigured, signInWithApple, signInWithGoogle } from '@/lib/social-auth'
import { buttonGlass, colors, font, glass, radius } from '@/lib/theme'

export default function WelcomeScreen() {
  const router = useRouter()
  const { session, loading, signIn, signUp, requestPasswordReset, confirmPasswordReset } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function switchMode(next: 'signin' | 'signup' | 'reset') {
    setMode(next)
    setCodeSent(false)
    setCode('')
    setError('')
    setInfo('')
  }

  useEffect(() => {
    if (!loading && session) {
      // First-timers (per device) see onboarding before the app proper.
      isOnboardingComplete().then((done) => router.replace(done ? '/chat' : '/onboarding'))
    }
  }, [loading, router, session])

  async function submit() {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'reset') {
        if (!codeSent) {
          await requestPasswordReset(email.trim())
          setCodeSent(true)
          setInfo('We emailed you a reset code. Enter it below with a new password.')
        } else {
          await confirmPasswordReset(email.trim(), code.trim(), password)
          const done = await isOnboardingComplete()
          router.replace(done ? '/chat' : '/onboarding')
        }
        return
      }
      if (mode === 'signin') await signIn(email.trim(), password)
      else await signUp(email.trim(), password)
      const done = await isOnboardingComplete()
      router.replace(done ? '/chat' : '/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    mode === 'reset' ? (codeSent ? Boolean(email && code && password) : Boolean(email)) : Boolean(email && password)
  const primaryLabel =
    mode === 'signin'
      ? 'Continue'
      : mode === 'signup'
        ? 'Create Nexxi account'
        : codeSent
          ? 'Reset password'
          : 'Send reset code'

  // Social sign-in: on success, onAuthStateChange sets the session → the effect above routes.
  async function handleSocial(provider: () => Promise<boolean>) {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await provider()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>nexxi</Text>
            <View style={styles.wordmarkDot} />
          </View>
          <Text style={styles.kicker}>PERSONAL BUYER AGENT</Text>
          <Text style={styles.title}>Shop the agent-ready web with your own buyer agent.</Text>
        </View>

        <View style={styles.panel}>
          {mode === 'reset' ? (
            <View style={styles.resetHeader}>
              <Text accessibilityRole="header" style={styles.resetTitle}>Reset your password</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Back to sign in" onPress={() => switchMode('signin')}>
                <Text style={styles.link}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.tabRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'signin' }}
                accessibilityLabel="Sign in"
                style={styles.tab}
                onPress={() => switchMode('signin')}
              >
                <Text style={[styles.tabText, mode === 'signin' ? styles.tabTextActive : null]}>Sign in</Text>
                <View style={[styles.tabUnderline, mode === 'signin' ? styles.tabUnderlineActive : null]} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'signup' }}
                accessibilityLabel="Create account"
                style={styles.tab}
                onPress={() => switchMode('signup')}
              >
                <Text style={[styles.tabText, mode === 'signup' ? styles.tabTextActive : null]}>Create account</Text>
                <View style={[styles.tabUnderline, mode === 'signup' ? styles.tabUnderlineActive : null]} />
              </Pressable>
            </View>
          )}

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="Email"
            placeholderTextColor={colors.text3}
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            editable={!(mode === 'reset' && codeSent)}
            style={[styles.input, mode === 'reset' && codeSent ? styles.disabled : null]}
          />

          {mode === 'reset' && codeSent ? (
            <>
              <TextInput
                autoCapitalize="none"
                keyboardType="number-pad"
                placeholder="Reset code (from email)"
                placeholderTextColor={colors.text3}
                accessibilityLabel="Reset code"
                value={code}
                onChangeText={setCode}
                style={styles.input}
              />
              <TextInput
                secureTextEntry
                textContentType="newPassword"
                placeholder="New password"
                placeholderTextColor={colors.text3}
                accessibilityLabel="New password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
            </>
          ) : mode !== 'reset' ? (
            <TextInput
              secureTextEntry
              textContentType={mode === 'signin' ? 'password' : 'newPassword'}
              placeholder="Password"
              placeholderTextColor={colors.text3}
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Pressable
            disabled={busy || !canSubmit}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            accessibilityState={{ disabled: busy || !canSubmit, busy }}
            onPress={submit}
            style={[buttonGlass.base, busy || !canSubmit ? buttonGlass.disabled : null]}
          >
            {busy ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={[buttonGlass.label, busy || !canSubmit ? buttonGlass.disabledLabel : null]}>{primaryLabel}</Text>
            )}
          </Pressable>

          {mode === 'signin' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Forgot password" onPress={() => switchMode('reset')}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          ) : null}

          {mode !== 'reset' && (isAppleSignInSupported || isGoogleSignInConfigured) ? (
            <View style={styles.socialBlock}>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
              {isAppleSignInSupported ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
                  cornerRadius={radius.md}
                  style={styles.appleButton}
                  onPress={() => handleSocial(signInWithApple)}
                />
              ) : null}
              {isGoogleSignInConfigured ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  disabled={busy}
                  onPress={() => handleSocial(signInWithGoogle)}
                  style={[styles.googleButton, busy ? styles.disabled : null]}
                >
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View
            style={styles.footerRow}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View style={styles.lock}>
              <View style={styles.lockShackle} />
              <View style={styles.lockBody} />
            </View>
            <Text style={styles.note}>SAME SECURE ACCOUNT AS NEXEZ</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    gap: 24,
  },
  hero: {
    paddingTop: 34,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  wordmark: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 25,
    letterSpacing: -0.4,
  },
  wordmarkDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginLeft: 3,
    marginBottom: 6,
  },
  kicker: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.6,
    marginTop: 12,
  },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    marginBottom: 4,
  },
  tab: {
    alignItems: 'flex-start',
  },
  tabText: {
    color: colors.text3,
    fontFamily: font.sans600,
    fontSize: 14,
    paddingBottom: 10,
  },
  tabTextActive: {
    color: colors.text,
  },
  tabUnderline: {
    height: 2,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    marginBottom: -1,
  },
  tabUnderlineActive: {
    backgroundColor: colors.accent,
  },
  input: {
    ...glass,
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: font.sans,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: colors.danger,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    color: colors.success,
    fontFamily: font.mono,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  info: {
    color: colors.accent,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: colors.accent,
    fontFamily: font.sans600,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 4,
  },
  resetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetTitle: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  socialBlock: {
    gap: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  appleButton: {
    height: 50,
    width: '100%',
  },
  googleButton: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 2,
  },
  lock: {
    width: 10,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lockShackle: {
    width: 6,
    height: 6,
    borderColor: colors.success,
    borderWidth: 1.4,
    borderBottomWidth: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginBottom: -1,
  },
  lockBody: {
    width: 10,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
})
