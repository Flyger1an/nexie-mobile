import * as Haptics from 'expo-haptics'

// Tactile feedback. All calls are best-effort — a missing/disabled haptics engine must
// never throw into a flow, so every promise is swallowed.

/** Light tap — sending a message, toggling voice. */
export function tapHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

/** Medium tap — a consequential decision (approve / reject an action). */
export function decisionHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

/** Success notification — a booking/negotiation action completed. */
export function successHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}

/** Error notification — an action or turn failed. */
export function errorHaptic() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
}
