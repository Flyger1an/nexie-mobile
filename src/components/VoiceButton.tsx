import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { tapHaptic } from '@/lib/haptics'
import { stopSpeaking } from '@/lib/speech'
import { colors } from '@/lib/theme'

type VoiceButtonProps = {
  onTranscript: (text: string, final: boolean) => void
  disabled?: boolean
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [recognizing, setRecognizing] = useState(false)
  const [error, setError] = useState('')

  useSpeechRecognitionEvent('start', () => {
    setError('')
    setRecognizing(true)
  })
  useSpeechRecognitionEvent('end', () => setRecognizing(false))
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? ''
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
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    width: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: 'rgba(251,113,133,0.14)',
    borderColor: 'rgba(251,113,133,0.5)',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  icon: {
    color: colors.signal,
    fontSize: 18,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: 11,
    marginTop: 6,
    maxWidth: 170,
  },
})
