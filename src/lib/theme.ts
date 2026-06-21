// "Concierge Dark" design system.
// Warm dark espresso (never pure black). The agent is a CONCIERGE that speaks in a serif voice.
// One persimmon `accent` guides attention + requests approval; a separate green `success` CONFIRMS
// money actions. Ink (cream `text`) is the neutral primary button.
//
// Token names are stable: components reference these keys. The legacy names (signal/muted/faint)
// are kept as aliases mapped onto the new palette so the warm recolor lands app-wide without
// touching every call site.

export const colors = {
  // base — warm espresso, NOT pure black
  bg: '#16130F', // app background ("paper")
  panel: '#211C16', // cards / surfaces ("card")
  panel2: '#2A241C', // nested inputs / chips / segmented tracks
  tabbar: '#1C1813', // tab bar background

  // ink (text on dark)
  text: '#F1EBDF', // cream — primary text + the neutral "ink" button fill
  text2: 'rgba(241,235,223,0.64)', // secondary
  text3: 'rgba(241,235,223,0.42)', // faint / mono labels / timestamps
  onAccent: '#16130F', // text on a filled cream/persimmon button

  // lines
  border: 'rgba(241,235,223,0.14)', // hairlines, outlined controls
  borderSoft: 'rgba(241,235,223,0.08)', // faintest dividers

  // brand + semantic
  accent: '#F26642', // persimmon — brand, active nav, agent voice, attention / "approval required"
  accentSoft: 'rgba(242,102,66,0.14)', // persimmon tint fills (approval card, chips)
  accentInk: '#FFF4EF', // label on a filled persimmon button
  success: '#46A077', // green — CONFIRM money actions only (Approve, Open secure link, Paid)
  amber: '#D9A24A', // refunded / warning
  danger: '#FB7185', // destructive (delete account) — distinct from accent/amber

  // ---- legacy aliases (existing components import these names) ----
  muted: 'rgba(241,235,223,0.64)', // → text2
  faint: 'rgba(241,235,223,0.42)', // → text3
  signal: '#F26642', // → accent (was teal; now persimmon)
} as const

export const radius = { sm: 8, md: 11, lg: 14, xl: 20, pill: 999 } as const

// Card shadow on dark (RN translation of the mock's drop shadow).
export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.7,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 12 },
  elevation: 6,
} as const

// Font families — loaded in app/_layout.tsx via @expo-google-fonts. RN does not synthesize weights
// for custom fonts, so each weight is its own family.
export const font = {
  serif: 'InstrumentSerif_400Regular', // headings, agent replies, prices, big numbers — the agent's "voice"
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'HankenGrotesk_500Medium', // default UI text
  sans400: 'HankenGrotesk_400Regular',
  sans600: 'HankenGrotesk_600SemiBold',
  sans700: 'HankenGrotesk_700Bold',
  sans800: 'HankenGrotesk_800ExtraBold',
  mono: 'JetBrainsMono_500Medium', // UPPERCASE eyebrows, timestamps, slugs (~10px, letter-spacing ~0.14em)
  mono600: 'JetBrainsMono_600SemiBold',
} as const
