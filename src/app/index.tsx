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

import { useAuth } from '@/context/auth'
import { isOnboardingComplete } from '@/lib/onboarding'
import { colors, radius } from '@/lib/theme'

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

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.signal} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.orb} />
          <Text style={styles.kicker}>Nexxi</Text>
          <Text style={styles.title}>Shop the agent-ready web with your personal buyer agent.</Text>
          <Text style={styles.subtitle}>
            Search Nexez pages, get service recommendations, negotiate terms, and start bookings by voice or text.
          </Text>
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
            <View style={styles.segment}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'signin' }}
                accessibilityLabel="Sign in"
                style={[styles.segmentButton, mode === 'signin' ? styles.segmentActive : null]}
                onPress={() => switchMode('signin')}
              >
                <Text style={[styles.segmentText, mode === 'signin' ? styles.segmentTextActive : null]}>Sign in</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'signup' }}
                accessibilityLabel="Create account"
                style={[styles.segmentButton, mode === 'signup' ? styles.segmentActive : null]}
                onPress={() => switchMode('signup')}
              >
                <Text style={[styles.segmentText, mode === 'signup' ? styles.segmentTextActive : null]}>Create account</Text>
              </Pressable>
            </View>
          )}

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="Email"
            placeholderTextColor={colors.faint}
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
                placeholderTextColor={colors.faint}
                accessibilityLabel="Reset code"
                value={code}
                onChangeText={setCode}
                style={styles.input}
              />
              <TextInput
                secureTextEntry
                textContentType="newPassword"
                placeholder="New password"
                placeholderTextColor={colors.faint}
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
              placeholderTextColor={colors.faint}
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
            style={[styles.primary, busy || !canSubmit ? styles.disabled : null]}
          >
            {busy ? <ActivityIndicator color="#001313" /> : <Text style={styles.primaryText}>{primaryLabel}</Text>}
          </Pressable>

          {mode === 'signin' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Forgot password" onPress={() => switchMode('reset')}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          ) : null}

          <Text style={styles.note}>Uses the same secure Supabase account as Nexez.</Text>
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
  orb: {
    width: 70,
    height: 70,
    borderRadius: 28,
    backgroundColor: colors.signal,
    shadowColor: colors.signal,
    shadowOpacity: 0.45,
    shadowRadius: 30,
    marginBottom: 24,
  },
  kicker: {
    color: colors.signal,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2.6,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    lineHeight: 43,
    fontWeight: '900',
    letterSpacing: -2.1,
    marginTop: 10,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
  },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 16,
    gap: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: colors.text,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 13,
  },
  segmentTextActive: {
    color: '#050507',
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  primary: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryText: {
    color: '#001313',
    fontWeight: '900',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    color: colors.faint,
    fontSize: 12,
    textAlign: 'center',
  },
  info: {
    color: colors.signal,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: colors.signal,
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
})
