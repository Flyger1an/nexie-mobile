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

/**
 * Incremental TTS for streamed replies: feed it token deltas and it speaks each *complete
 * sentence* the moment it forms, so Nexxi starts talking while the rest is still arriving.
 * expo-speech queues utterances, so sequential `speak` calls play back in order.
 *
 * Caller should `stopSpeaking()` once before the first `push` (to cut any prior turn), then
 * `flush()` at the end to voice the trailing partial sentence, or `cancel()` on error.
 */
export function createIncrementalSpeaker() {
  let buffer = ''
  const say = (text: string) => {
    const clean = text.trim()
    if (!clean) return
    try {
      Speech.speak(clean, { rate: 1.0, pitch: 1.0 })
    } catch {
      // TTS unavailable — ignore
    }
  }
  return {
    push(delta: string) {
      buffer += delta
      // Emit every complete sentence (terminator + optional closing quote/bracket + whitespace).
      // Requiring trailing whitespace avoids splitting decimals/abbreviations mid-token ("$3.5M").
      for (;;) {
        const match = buffer.match(/[.!?]+["')\]]*\s+/)
        if (!match || match.index === undefined) break
        const end = match.index + match[0].length
        say(buffer.slice(0, end))
        buffer = buffer.slice(end)
      }
    },
    flush() {
      say(buffer)
      buffer = ''
    },
    cancel() {
      buffer = ''
      stopSpeaking()
    },
  }
}
