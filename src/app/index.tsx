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
  const { session, loading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && session) {
      // First-timers (per device) see onboarding before the app proper.
      isOnboardingComplete().then((done) => router.replace(done ? '/chat' : '/onboarding'))
    }
  }, [loading, router, session])

  async function submit() {
    setError('')
    setBusy(true)
    try {
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
          <View style={styles.segment}>
            <Pressable style={[styles.segmentButton, mode === 'signin' ? styles.segmentActive : null]} onPress={() => setMode('signin')}>
              <Text style={[styles.segmentText, mode === 'signin' ? styles.segmentTextActive : null]}>Sign in</Text>
            </Pressable>
            <Pressable style={[styles.segmentButton, mode === 'signup' ? styles.segmentActive : null]} onPress={() => setMode('signup')}>
              <Text style={[styles.segmentText, mode === 'signup' ? styles.segmentTextActive : null]}>Create account</Text>
            </Pressable>
          </View>

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="Email"
            placeholderTextColor={colors.faint}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            secureTextEntry
            textContentType={mode === 'signin' ? 'password' : 'newPassword'}
            placeholder="Password"
            placeholderTextColor={colors.faint}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={busy || !email || !password} onPress={submit} style={[styles.primary, busy || !email || !password ? styles.disabled : null]}>
            {busy ? <ActivityIndicator color="#001313" /> : <Text style={styles.primaryText}>{mode === 'signin' ? 'Continue' : 'Create Nexxi account'}</Text>}
          </Pressable>
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
})
