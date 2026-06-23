// "Concierge Gold" design system (Gloss Black / Glass) — evolution of Concierge Dark.
//
// Glossy near-black paper, warm cream ink, a persimmon accent that GUIDES (rings/borders/dots/active
// states — NEVER a solid button fill), GOLD for confirm/secure STATUS (lock, "Paid", confirmed),
// a separate confirm-GREEN for the affirmative money buttons (Approve / Open secure link), and
// translucent glass surfaces. Token NAMES are stable so components don't churn; legacy names
// (signal/muted/faint) are aliases. True backdrop-blur (expo-blur) ships with the next native
// rebuild — surfaces approximate glass with a translucent fill + border + an inset top sheen.

export const colors = {
  // base
  bg: '#0B0B0D', // gloss-black "paper"
  panel: 'rgba(247,242,233,0.06)', // glass card / input / field fill
  panel2: 'rgba(247,242,233,0.10)', // nested inputs / chips / segmented tracks (slightly more opaque)
  tabbar: 'rgba(18,18,22,0.5)', // frosted tab bar

  // ink (warm cream)
  text: '#F1EBDF', // primary
  text2: 'rgba(241,235,223,0.64)', // secondary
  text3: 'rgba(241,235,223,0.42)', // tertiary / placeholders
  onAccent: '#0B0B0D', // text on a cream (ink) fill

  // lines
  border: 'rgba(241,235,223,0.14)',
  borderSoft: 'rgba(241,235,223,0.08)',
  sheen: 'rgba(255,255,255,0.14)', // inset top hairline (glass-sheen approximation)

  // brand — persimmon GUIDES (rings/borders/dots/active); never a solid fill
  accent: '#FF6A33',
  accentDeep: '#DB4A22', // darker persimmon (eyebrow bars/accents)
  accentSoft: 'rgba(255,106,51,0.14)', // persimmon tint fill (chips, highlighted cards)
  accentInk: '#FFF4EF', // rare: text on a persimmon tint

  // status / confirm
  success: '#C9A867', // GOLD — confirm/paid/secure STATUS (lock, "Paid", confirmed top-bar/eyebrow)
  amber: '#D9A24A', // refunded / warning
  confirm: '#3E8C68', // GREEN — affirmative money buttons (Approve, Open secure link). Independent of success.
  confirmDeep: '#2F6B4E',
  confirmInk: '#F2FBF5', // label on a confirm-green glass button
  danger: '#FB7185', // destructive (delete account)

  // legacy aliases (existing components import these names)
  muted: 'rgba(241,235,223,0.64)', // → text2
  faint: 'rgba(241,235,223,0.42)', // → text3
  signal: '#FF6A33', // → accent
} as const

export const radius = { sm: 8, md: 11, lg: 14, xl: 20, pill: 999 } as const

// Glass-card drop shadow on the gloss-black paper.
export const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.55,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 18 },
  elevation: 6,
} as const

// Translucent glass surface (card / input). Spread into a style, then add `cardShadow` + a radius.
// borderTopColor adds the inset-sheen highlight that sells "glass" without a real backdrop blur.
export const glass = {
  backgroundColor: colors.panel,
  borderWidth: 1,
  borderColor: colors.border,
  borderTopColor: colors.sheen,
} as const

// Primary button = glass + persimmon RING (no fill). The signature interactive treatment for
// Continue / Next / Get started / Send / Ask Nexxi / voice mic / Save. Spread `base` + `label`;
// layer `disabled`/`disabledLabel` (e.g. empty Send) or `confirm`/`confirmLabel` (Approve / secure link).
export const buttonGlass = {
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,106,51,0.12)',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  label: { color: colors.text, fontFamily: 'SchibstedGrotesk_800ExtraBold', fontSize: 15 },
  disabled: { backgroundColor: 'rgba(255,106,51,0.07)', borderColor: 'rgba(255,106,51,0.45)', opacity: 0.7 },
  disabledLabel: { color: colors.text2 },
  confirm: { backgroundColor: 'rgba(62,140,104,0.14)', borderColor: colors.confirm },
  confirmLabel: { color: colors.confirmInk },
} as const

// Font families — loaded at runtime in app/_layout.tsx via @expo-google-fonts (no native rebuild).
export const font = {
  serif: 'Newsreader_400Regular', // display / agent "voice" — titles, agent lines, prices, "nexxi" wordmark
  serifMedium: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'SchibstedGrotesk_500Medium', // UI default
  sans400: 'SchibstedGrotesk_400Regular',
  sans600: 'SchibstedGrotesk_600SemiBold',
  sans700: 'SchibstedGrotesk_700Bold',
  sans800: 'SchibstedGrotesk_800ExtraBold',
  mono: 'JetBrainsMono_500Medium', // UPPERCASE eyebrows / timestamps / step counters
  mono600: 'JetBrainsMono_600SemiBold',
} as const
