import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/context/auth'
import { tapHaptic } from '@/lib/haptics'
import { markOnboardingComplete } from '@/lib/onboarding'
import { registerPushTokenForSession } from '@/lib/push-notifications'
import { colors, font, radius } from '@/lib/theme'

type PanelIcon = 'dot' | 'check' | 'bell'

const PANELS: { icon: PanelIcon; title: string; body: string }[] = [
  {
    icon: 'dot',
    title: 'Meet Nexxi',
    body: 'Your personal buyer agent. Tell Nexxi what you want — it searches the agent-ready web, compares offers, and negotiates for you, by text or voice.',
  },
  {
    icon: 'check',
    title: 'You stay in control',
    body: 'Nexxi can make mistakes, so it always asks for your approval before it negotiates or opens checkout. Nothing moves without your tap.',
  },
  {
    icon: 'bell',
    title: 'Never miss a reply',
    body: 'Get notified the moment a seller responds or a booking is confirmed, so a deal never stalls while you wait.',
  },
]

function PanelGlyph({ icon }: { icon: PanelIcon }) {
  if (icon === 'check') {
    return (
      <View style={styles.glyphBox}>
        <View style={styles.checkShort} />
        <View style={styles.checkLong} />
      </View>
    )
  }
  if (icon === 'bell') {
    return (
      <View style={styles.glyphBox}>
        <View style={styles.bellBody} />
        <View style={styles.bellRim} />
        <View style={styles.bellClapper} />
      </View>
    )
  }
  return (
    <View style={styles.glyphBox}>
      <View style={styles.dot} />
    </View>
  )
}

export default function OnboardingScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const [step, setStep] = useState(0)
  const isLast = step === PANELS.length - 1
  const panel = PANELS[step]

  async function finish() {
    tapHaptic()
    await markOnboardingComplete()
    // Request notifications now (in-context, right after the value was explained) rather
    // than cold-prompting during signup. Best-effort; never blocks entry.
    if (session) registerPushTokenForSession(session).catch(() => {})
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

  const stepLabel = String(step + 1).padStart(2, '0')

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.top}>
        <Pressable onPress={finish} hitSlop={10} accessibilityLabel="Skip onboarding">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View
          style={styles.stepRow}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={styles.stepNum}>STEP {stepLabel}</Text>
          <View style={styles.stepRule} />
          <Text style={styles.stepTotal}>03</Text>
        </View>

        <View
          style={styles.glyphCircle}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <PanelGlyph icon={panel.icon} />
        </View>

        <Text accessibilityRole="header" style={styles.title}>{panel.title}</Text>
        <Text style={styles.copy}>{panel.body}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PANELS.map((p, i) => (
            <View key={p.title} style={[styles.dash, i === step ? styles.dashActive : null]} />
          ))}
        </View>
        <View style={styles.actions}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get started' : 'Next'}
            style={styles.primary}
            onPress={next}
          >
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
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 14,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNum: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  stepRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  stepTotal: {
    color: colors.text3,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  glyphCircle: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  checkShort: {
    position: 'absolute',
    left: 4,
    top: 11,
    width: 6,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    position: 'absolute',
    left: 7,
    top: 9,
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
    transform: [{ rotate: '-50deg' }],
  },
  bellBody: {
    width: 13,
    height: 12,
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  bellRim: {
    width: 18,
    height: 1.5,
    backgroundColor: colors.accent,
    marginTop: -0.5,
  },
  bellClapper: {
    width: 3,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: 1,
  },
  title: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  copy: {
    color: colors.text2,
    fontFamily: font.sans,
    fontSize: 15,
    lineHeight: 23,
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
  dash: {
    width: 16,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dashActive: {
    backgroundColor: colors.accent,
    width: 30,
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
    color: colors.text2,
    fontFamily: font.sans600,
    fontSize: 15,
  },
  backSpacer: {
    width: 0,
  },
  primary: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.accentInk,
    fontFamily: font.sans700,
    fontSize: 16,
  },
})
