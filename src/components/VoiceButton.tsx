import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { tapHaptic } from '@/lib/haptics'
import { stopSpeaking } from '@/lib/speech'
import { colors, font, radius } from '@/lib/theme'

type VoiceButtonProps = {
  onTranscript: (text: string, final: boolean) => void
  disabled?: boolean
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [recognizing, setRecognizing] = useState(false)
  const [error, setError] = useState('')
  // Local mirror of the live transcript, for the listening overlay only. The
  // authoritative transcript still flows to the parent via onTranscript below.
  const [liveTranscript, setLiveTranscript] = useState('')

  useSpeechRecognitionEvent('start', () => {
    setError('')
    setLiveTranscript('')
    setRecognizing(true)
  })
  useSpeechRecognitionEvent('end', () => setRecognizing(false))
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? ''
    setLiveTranscript(text)
    if (text) onTranscript(text, event.isFinal)
  })
  useSpeechRecognitionEvent('error', (event) => {
    setRecognizing(false)
    setError(event.message || event.error)
  })

  async function toggle() {
    if (disabled) return
    tapHaptic()
    if (recognizing) {
      ExpoSpeechRecognitionModule.stop()
      return
    }

    const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permissions.granted) {
      setError('Microphone and speech recognition permission are required.')
      return
    }

    stopSpeaking() // don't talk over the user while they dictate
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    })
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recognizing ? 'Stop voice input' : 'Start voice input'}
        onPress={toggle}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          recognizing ? styles.active : null,
          disabled ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.icon}>{recognizing ? '■' : '●'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ListeningOverlay
        visible={recognizing}
        transcript={liveTranscript}
        onStop={() => ExpoSpeechRecognitionModule.stop()}
      />
    </View>
  )
}

type ListeningOverlayProps = {
  visible: boolean
  transcript: string
  onStop: () => void
}

// The full-screen "LISTENING" state: a persimmon mic orb with a soft halo and two
// expanding rings, the live transcript in the serif voice with a blinking caret,
// and a "Tap to stop" pill. Restyle only — the stop press calls the module directly,
// haptics fire on the original toggle, and the transcript is read-only here.
function ListeningOverlay({ visible, transcript, onStop }: ListeningOverlayProps) {
  const reduceMotion = useReducedMotion()
  const ring1 = useSharedValue(0)
  const ring2 = useSharedValue(0)
  const caret = useSharedValue(1)

  useEffect(() => {
    if (!visible || reduceMotion) {
      cancelAnimation(ring1)
      cancelAnimation(ring2)
      cancelAnimation(caret)
      ring1.value = 0
      ring2.value = 0
      caret.value = 1
      return
    }
    ring1.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false)
    // Stagger the second ring so the pulse reads as a continuous wave.
    ring2.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false)
    caret.value = withRepeat(withTiming(0, { duration: 600, easing: Easing.linear }), -1, true)
    return () => {
      cancelAnimation(ring1)
      cancelAnimation(ring2)
      cancelAnimation(caret)
    }
  }, [visible, reduceMotion, ring1, ring2, caret])

  const ring1Style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - ring1.value),
    transform: [{ scale: 1 + ring1.value * 1.6 }],
  }))
  const ring2Style = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - ring2.value),
    transform: [{ scale: 1 + ring2.value * 1.6 }],
  }))
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }))

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onStop}>
      <View style={styles.overlay}>
        <Text style={styles.eyebrow}>LISTENING</Text>

        <View style={styles.orbWrap}>
          {!reduceMotion ? (
            <>
              <Animated.View style={[styles.ring, ring1Style]} />
              <Animated.View style={[styles.ring, ring2Style]} />
            </>
          ) : null}
          <View style={styles.halo} />
          <View style={styles.orb}>
            <Text style={styles.orbIcon}>●</Text>
          </View>
        </View>

        <View style={styles.transcriptWrap}>
          <Text style={styles.transcript}>
            {transcript || 'Listening…'}
            <Animated.Text style={[styles.caret, caretStyle]}>|</Animated.Text>
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop voice input"
          onPress={onStop}
          style={({ pressed }) => [styles.stopPill, pressed ? styles.pressed : null]}
        >
          <View style={styles.stopGlyph} />
          <Text style={styles.stopText}>Tap to stop</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    width: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  icon: {
    color: colors.accent,
    fontSize: 18,
  },
  error: {
    color: colors.danger,
    fontFamily: font.sans,
    fontSize: 11,
    marginTop: 6,
    maxWidth: 170,
  },

  // ---- listening overlay ----
  overlay: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  orbWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  halo: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  orb: {
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,106,51,0.12)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbIcon: {
    color: colors.text,
    fontSize: 26,
  },
  transcriptWrap: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcript: {
    color: colors.text,
    fontFamily: font.serif,
    fontSize: 21,
    lineHeight: 28,
    textAlign: 'center',
  },
  caret: {
    color: colors.accent,
    fontFamily: font.serif,
    fontSize: 21,
  },
  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  stopGlyph: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  stopText: {
    color: colors.text,
    fontFamily: font.sans600,
    fontSize: 13,
  },
})
