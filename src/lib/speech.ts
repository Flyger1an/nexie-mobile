import * as Speech from 'expo-speech'

// Text-to-speech for Nexie replies. Best-effort: TTS must never break the chat flow.

/** Speak a reply aloud, cancelling any in-flight utterance first. */
export function speak(text: string) {
  const clean = (text || '').trim()
  if (!clean) return
  try {
    Speech.stop()
    Speech.speak(clean, { rate: 1.0, pitch: 1.0 })
  } catch {
    // TTS unavailable on this device — ignore
  }
}

/** Stop any in-progress speech (e.g. when the user starts talking or sends a new turn). */
export function stopSpeaking() {
  try {
    Speech.stop()
  } catch {
    // ignore
  }
}
