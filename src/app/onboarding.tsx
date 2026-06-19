import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { tapHaptic } from '@/lib/haptics'
import { markOnboardingComplete } from '@/lib/onboarding'
import { colors, radius } from '@/lib/theme'

const PANELS = [
  {
    glyph: '🧭',
    title: 'Meet Nexxi',
    body: 'Your personal buyer agent. Tell Nexxi what you want — it searches the agent-ready web, compares offers, and negotiates for you, by text or voice.',
  },
  {
    glyph: '✅',
    title: 'You stay in control',
    body: 'Nexxi always asks for your approval before it negotiates or opens checkout. Nothing moves without your tap.',
  },
  {
    glyph: '🔔',
    title: 'Never miss a reply',
    body: 'Get notified the moment a seller responds or a booking is confirmed, so a deal never stalls while you wait.',
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const isLast = step === PANELS.length - 1
  const panel = PANELS[step]

  async function finish() {
    tapHaptic()
    await markOnboardingComplete()
    router.replace('/chat')
  }

  function next() {
    tapHaptic()
    if (isLast) {
      finish()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.top}>
        <Pressable onPress={finish} hitSlop={10} accessibilityLabel="Skip onboarding">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.glyph}>{panel.glyph}</Text>
        <Text style={styles.title}>{panel.title}</Text>
        <Text style={styles.copy}>{panel.body}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PANELS.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === step ? styles.dotActive : null]} />
          ))}
        </View>
        <View style={styles.actions}>
          {step > 0 ? (
            <Pressable
              style={styles.back}
              onPress={() => {
                tapHaptic()
                setStep((s) => s - 1)
              }}
            >
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <Pressable style={styles.primary} onPress={next}>
            <Text style={styles.primaryText}>{isLast ? 'Get started' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skip: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 18,
  },
  glyph: {
    fontSize: 64,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.6,
  },
  copy: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 18,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    backgroundColor: colors.signal,
    width: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  backText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '800',
  },
  backSpacer: {
    width: 0,
  },
  primary: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.signal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#001313',
    fontSize: 16,
    fontWeight: '900',
  },
})
