# Nexxi — Product Roadmap: Scaffold → Public Launch

> **Status:** Foundational scaffold complete (auth, single-thread chat, voice-in, search/approval/action cards, owner-scoped backend). This document is the source of truth for everything between here and a publicly launched app on the App Store and Google Play.
>
> **Last updated:** 2026-06-18
> **Owner:** @realestglad
> **Companion repos:** `nexie-mobile` (this app) · `nexez` (backend: `/api/agents/nexie`, checkout, negotiations, order portal)

---

## 1. Vision & Scope

**Nexxi is a standalone native consumer app — a personal shopping/buyer agent.** Users download it from the App Store / Play Store and use it to:

1. **Shop the Nexez platform** — discover AI-ready business pages, compare offers, negotiate terms, and book/checkout, all conversationally (text + voice).
2. **Get recommendations from other sources** (v1.x) — Nexxi can suggest products/services beyond Nexez.
3. **Shop other platforms** (v2+) — pluggable source adapters let Nexxi transact across the broader web.

The agent always represents the **buyer's** intent. Money-moving and offer-submitting actions are **human-approved** (the approval ledger is the safety spine).

### v1.0 scope (what ships at public launch)
- Conversational discovery + comparison over Nexez pages (text + **voice in and out**).
- Negotiation initiation + booking/checkout handoff, gated by explicit approval.
- **Authenticated buyer-order linkage**: purchases & negotiations started in Nexxi appear natively in an in-app Orders tab.
- Push notifications for async events (seller counters, booking confirmations, refunds).
- Durable per-user memory & multi-thread history.
- Account lifecycle: sign-up, social sign-in, password reset, **account deletion**.
- Store-compliant, monitored, crash-reported, OTA-updatable.

### Explicitly OUT of v1.0 (deferred)
- Shopping non-Nexez platforms (v2 — but the *abstraction* lands in v1, see §3).
- In-app payment card entry / Apple Pay sheet inside Nexxi (v1 hands off to Stripe Checkout; revisit native pay in v1.x).
- Multi-language / localization beyond en-US.
- Tablet/iPad-optimized layout (`supportsTablet: false` today).
- Web build as a first-class product (Expo web stays a dev convenience).

---

## 2. Current State (baseline audit)

### Exists and works
- Expo Router app: Welcome/auth → Chat → Settings. Flat Stack nav.
- Email/password auth via shared Nexez Supabase project (`src/context/auth.tsx`).
- Single in-memory chat thread; cards for page results, approvals, action results.
- Native voice **input** via `expo-speech-recognition`.
- Backend agent (`nexez/lib/agents/nexie.ts`): OpenAI-compatible tool loop (`search_pages`, `initiate_negotiation`, `trigger_booking`) with deterministic search fallback; bearer-token auth; RLS owner-scoped tables; approval ledger.

### Known gaps (drives the phases below)
| # | Gap | Severity |
|---|-----|----------|
| 1 | Supabase **tokens stored in AsyncStorage (plaintext)** | 🔴 Security |
| 2 | No push notifications — async negotiation loop is inert | 🔴 Product-critical |
| 3 | **Checkout/negotiation carry no buyer identity** → Nexxi orders don't surface in-app or in the buyer portal | 🔴 Product-critical |
| 4 | No voice **output** (TTS) despite voice-tuned prompt | 🟠 Core UX |
| 5 | No thread history, no Orders screen (DB rows created but never listed) | 🟠 Core UX |
| 6 | No crash/error reporting, no analytics | 🟠 Ops |
| 7 | Email/password only — no Apple/Google sign-in, no password reset, no account deletion | 🟠 Store-blocker |
| 8 | `expo-web-browser` installed but unused — Stripe checkout strands user in Safari | 🟠 Core UX |
| 9 | `assertEnv()` defined but never called | 🟡 Reliability |
| 10 | Backend search is in-memory lexical over ≤150 rows | 🟡 Scale ceiling |
| 11 | No tests, no CI/CD, no OTA updates channel | 🟡 Quality |
| 12 | Placeholder assets (react-logo/expo-badge), no store screenshots | 🟡 Store-blocker |
| 13 | No privacy policy / data-disclosure / legal | 🟠 Store-blocker |
| 14 | "Book"/"Negotiate" buttons only pre-fill text instead of acting | 🟡 UX |

---

## 3. Architecture & Guiding Principles

1. **Approval-gated actions.** No money moves or offers submit without an explicit user tap recorded in `agent_action_approvals`. Never claim success before an EXECUTED result.
2. **Owner-scoped by RLS, everywhere.** Every read/write runs through the user-scoped client; the bearer token is validated server-side.
3. **Secrets never in the bundle.** `EXPO_PUBLIC_*` holds only the anon key + API URL. SecureStore for session tokens.
4. **Graceful degradation.** LLM down → deterministic search. Network down → cached state + clear offline UX.
5. **Source-adapter seam (the multi-platform bet).** The `search_pages` tool must become one *source adapter* behind a common interface (`{ search, getOffer, initiateNegotiation, checkout }`). v1 ships a single `nexez` adapter; v2 adds others without touching the agent loop. **Design this seam in P3 even though only one adapter exists.**
6. **Authenticated buyer-order linkage (new, critical).** Because Nexxi users are signed in, every Nexxi-initiated checkout/negotiation must thread the buyer's email + user id into Stripe session metadata so orders are queryable by the authenticated user — not only via the email magic-link portal. See P1.

### Topology
- `app.nexez.ai` — authenticated product + `/api/agents/nexie` (Nexxi's backend).
- `nexez.app` — public agent pages/artifacts (agent runtime).
- `nexie://` — app deep-link scheme (OAuth return, checkout return, push deep links).

---

## 4. Phased Roadmap

> Effort sizing: **S** ≈ ≤1 day · **M** ≈ 2–4 days · **L** ≈ 1–2 weeks. iOS-first, Android in parallel where free. Each phase has an **Exit Gate** that must be green before the next begins.

### P0 — Hardening & Foundations 🔴
*Goal: make the scaffold safe and observable before adding surface area.*

| Task | Pkg / Area | Effort |
|------|-----------|--------|
| Move Supabase session storage to `expo-secure-store` adapter (native); keep web `localStorage` | `expo-secure-store` | S |
| Call `assertEnv()` at root layout startup; fail loud on misconfig | `src/lib/env.ts` | S |
| Add crash + error reporting, wire to release/version | `@sentry/react-native` (+ Expo plugin) | M |
| Add request timeout/abort to `sendNexieTurn`; typed error surface | `src/lib/nexie-api.ts` | S |
| Centralize an API client (auth header, retry/backoff, error mapping) | new `src/lib/api-client.ts` | M |
| Set up `expo-updates` (OTA) + release channels (dev/preview/prod) | `expo-updates`, `eas.json` | M |
| Per-profile env management in `eas.json` (no secrets in repo) | `eas.json`, EAS secrets | S |

**Exit Gate:** tokens encrypted at rest; a forced crash appears in Sentry tagged with version; misconfigured env fails on launch; OTA update pushes to a preview build.

---

### P1 — Close the Core Agent Loop 🔴
*Goal: the agent actually completes async transactions end-to-end, and the buyer sees them.*

#### 1a. Push notifications
| Task | Pkg / Area | Effort |
|------|-----------|--------|
| Register Expo push token; store per-user in Supabase (`user_push_tokens` table, RLS-scoped) | `expo-notifications`, `expo-device` | M |
| Backend: send push on negotiation counter/accept/decline, booking confirm, refund status | `nexez` cron + webhooks | M |
| Notification deep links route into the right thread/order (`nexie://thread/:id`, `nexie://orders/:id`) | `expo-linking` | M |
| Permission priming UX (don't cold-prompt) | UI | S |

#### 1b. Authenticated buyer-order linkage (architectural)
| Task | Pkg / Area | Effort |
|------|-----------|--------|
| `executeBooking`/`executeNegotiation` thread buyer `email` + `user_id` to `/api/checkout` & `/api/negotiations` | `nexez/lib/agents/nexie.ts` | M |
| Checkout route: set Stripe `customer_email` + `metadata.nexez_buyer_user_id`; webhook persists buyer linkage on `checkout_orders` | `nexez/app/api/checkout`, stripe webhook | M |
| New authenticated endpoint `GET /api/agents/nexie/orders` returning the buyer's orders + negotiations (by user_id/email) | `nexez` | M |
| Verify a Nexxi purchase appears in both the in-app Orders tab AND the existing `/orders/<token>` portal | e2e | S |

#### 1c. Voice output + tactile feedback
| Task | Pkg / Area | Effort |
|------|-----------|--------|
| TTS playback of assistant messages (auto in voice mode, toggle in text) | `expo-speech` | M |
| Haptics on approve/reject/booking/voice start-stop | `expo-haptics` | S |
| Voice session UX: barge-in, stop, visible transcript state | UI | M |

#### 1d. Checkout return
| Task | Pkg / Area | Effort |
|------|-----------|--------|
| Open Stripe Checkout via `openAuthSessionAsync` with `nexie://checkout-return`; handle success/cancel | `expo-web-browser` (installed) | M |
| Post-return: refresh order status, show confirmation card, fire success haptic | UI | S |

**Exit Gate:** a full loop works on a real device — discover → negotiate → seller counters (push received) → approve → checkout in-app → return to app → order shows "paid" in Orders tab → refund request available.

---

### P2 — Product Surfaces & Navigation ✅ COMPLETE (on-device VoiceOver pass done — `618152b`)
*Goal: turn one chat screen into a navigable app.*

| Task | Area | Effort |
|------|------|--------|
| ✅ Tab navigation: **Chat · Discover · Orders · Profile** (`app/(tabs)/`, auth-gated, emoji icons; deep-links switch tabs) | `expo-router` tabs | M |
| ✅ **Thread history**: list `agent_threads`, resume (restores cards), rename, archive, new-chat (History modal + chat-header buttons; `GET/PATCH /threads[/id]`) | UI + `GET threads` endpoint | M |
| ✅ **Orders tab**: list orders/negotiations w/ status + open the buyer portal (refund/report live there) | UI + P1b endpoint | L |
| ✅ **Discover tab**: browse the public `agent-pages.json` catalog w/ search + **category filter chips** (from page `industry`, `c58a1d8`) → Ask Nexxi (seeds chat) / View page. Trending/curated ranking still deferred (needs an engagement signal) | UI + backend feed | L |
| ✅ **Profile/Preferences**: budget, interests, timing, location, voice-replies default, **notifications on/off** (server-gated, `c58a1d8`/`b4ce5cf`) → `user_agents.preferences` (server-validated; the agent honors them every LLM turn) | UI | M |
| ✅ OfferCard **Book/Negotiate act directly** — tap submits the action turn (→ approval card), no more prefill; buttons disable mid-turn | `OfferCard.tsx` | S |
| ✅ Onboarding flow (3 value-prop panels, once per device via SecureStore flag, Skip/Get-started → `/chat`) + **in-context push-permission priming** (PushBridge defers the OS prompt until onboarded; onboarding requests it on finish) | UI | M |
| ✅ Empty / loading / error-retry states across screens (spinners + empty states + retry; polished shimmer skeletons optional) | UI | M |
| ✅ a11y **DONE incl. on-device TalkBack pass** (`ebb1817`+`a73bd8b`+`618152b`): every interactive element + input labelled, heading roles, **WCAG-AA contrast**, Dynamic-Type-safe. **On-device walkthrough (Android emulator, live accessibility-tree)** verified every flow announces correctly; the only 2 gaps (decorative emoji in the tab bar + onboarding glyphs) were fixed + **re-verified live**. Deeper design-system token/typography polish optional | `src/lib/theme.ts` + a11y | L |

**Exit Gate:** ✅ **MET (2026-06-19).** A new user onboards → discovers → asks/acts → sees it in Orders, never needing to know "threads" exist; the **full screen-reader pass was run on-device** (Android emulator, every flow checked via the live accessibility tree) — all controls announce correct labels + roles; the only 2 findings (decorative emoji) were fixed + re-verified live (`618152b`).

**On-device a11y checklist — the remaining exit-gate step (~5 min, needs a device/emulator):**
1. Turn on the screen reader (iOS: Settings → Accessibility → VoiceOver; Android: → TalkBack).
2. Swipe through each primary flow: auth → onboarding → Chat (send a message + an offer card → Book/Negotiate → Approve) → Discover (category chips + Ask Nexxi) → Orders → Profile (save prefs). Confirm every control announces a clear name + "button"/"header" role, headings are reachable, and nothing is silent or reads a raw glyph (＋/🕘/✎/✕/N).
3. Settings → Display → font size at MAX: confirm no clipping or overlap on those screens.

---

### P3 — Backend Depth (Retrieval, Memory, Streaming) 🟡
*Goal: raise the agent's ceiling and lay the multi-platform seam.*

| Task | Area | Effort |
|------|------|--------|
| ✅ **Semantic search (pgvector) LIVE** (nexez `d77d3b0`; migration `20260619134624` applied): embeddings (`text-embedding-3-small`) + `match_nexie_pages` RPC + hybrid merge with lexical. **Key set + backfill done 2026-06-19 (`/api/agents/nexie/reindex` → 15/15 embedded); retrieval verified (self-match 1.0, near-dup 0.96, unrelated ~0.5).** 15 tests | `nexez` + Supabase pgvector | L |
| ✅ **Source-adapter abstraction** (nexez `089f138`): `search_pages` delegates to a `SourceAdapter` registry via `searchAllSources` (fan-out → merge → rank → cap; failing source isolated, all-fail surfaces for fallback); `nexezAdapter` ships; register-by-config proven in tests (a stub joins the fan-out with zero agent-loop change) | `nexez/lib/agents` | M |
| ✅ **Structured memory extraction** (nexez `ec06831`): replaced the regex `extractInterest` with high-precision deterministic signal extraction — `budget_observed` (only with an explicit ceiling cue, so no mis-learned stray $), `timing_observed`, cleaned/deduped interests — merged into `user_agents.memory` as SOFT hints (explicit prefs stay authoritative) + already injected into the prompt. Pure `nexie-memory.ts` + 8 tests. LLM-based extraction deferred (deterministic avoids per-turn cost) | `nexez/lib/agents/nexie.ts` | M |
| ✅ **Streaming responses (SSE) + incremental TTS** — TRUE token-streaming through the tool-call loop (`onToken` threaded through `handleNexieTurn`→`runLlmAgent`; `chatCompletionStream` parses the LLM SSE + stitches split tool-call fragments) via `POST /api/agents/nexie/stream` (nexez `98c588f`, 9 tests); client consumes with `expo/fetch` + sentence-chunked TTS (`createIncrementalSpeaker`), inline placeholder bubble, `done` event authoritative (nexie-mobile `cc5f559` + footer-dedup `e31dd49`). **No native rebuild needed** (expo/fetch ships in the runtime). On-device verified on the emulator: placeholder→tokens→final+cards, both the no-tool and search+synthesis paths, no runtime errors | `nexez` route + client | L |
| ✅ **External discovery sources (Yelp + Google Places)** (nexez `dae0796`/`9bca23c`, mobile `3de383e`): two env-gated `SourceAdapter`s (YELP_API_KEY / GOOGLE_PLACES_API_KEY) join the fan-out, DISCOVERY-ONLY (offer:null → never bookable). Per-user **source picker** in Profile (`NexiePreferences.sources`; Nexez always-on); results attributed "via Yelp/Google". Dormant until keys set; picker dormant-state verified on-device. 21 tests | `nexez` + mobile | L |
| ✅ Tool-call observability (nexez `0dc912a`): `captureEvent` on the obs seam → per-turn `nexie.turn` (latency/mode/fellBack/tools/model) + `nexie.action` (negotiate/book latency+outcome) + `captureError` on LLM fallback & action failures; console + optional `OBSERVABILITY_WEBHOOK_URL` sink, fire-and-forget | `nexez` | S |
| ✅ Prompt-injection / jailbreak safety tests (nexez `d3d5202`): lock in that money-path buyer identity comes from the SESSION (payload `buyerEmail`/`buyerReference`/`contact` ignored; `buyerAgent` hardcoded) + failed actions surface | `nexez` tests | M |

**Exit Gate:** semantic search beats lexical on a labeled query set; adding a stub second adapter requires zero changes to the agent loop; streamed responses render token-by-token with TTS.

---

### P4 — Identity & Account 🟠
*Goal: real consumer auth and full account lifecycle (also unblocks store review).*

| Task | Pkg / Area | Effort |
|------|-----------|--------|
| **Sign in with Apple** (required by Apple once social login exists) | `expo-apple-authentication` + Supabase OAuth | M |
| **Google sign-in** | Supabase OAuth + `expo-web-browser` / `expo-auth-session` | M |
| **Password reset** + email verification flow | Supabase auth + deep link | M |
| **Account deletion** in-app (Apple Guideline 5.1.1(v)) — deletes Supabase user + cascades agent data | UI + `nexez` admin endpoint | M |
| Session expiry/refresh edge cases; signed-out deep-link handling | auth | S |
| Re-auth gate before destructive actions (delete account) | UI | S |

**Exit Gate:** user can sign in with Apple & Google, reset a password, and fully delete their account (verified: rows gone, can't sign back in).

---

### P5 — Trust, Safety & Compliance 🟠
*Goal: clear both app stores' policy bars and be legally shippable.*

| Task | Area | Effort |
|------|------|--------|
| **Privacy Policy** + **Terms of Service** (hosted URLs, linked in-app & store listings) | legal + web | M |
| App Store **Privacy Nutrition Label** / Play **Data Safety** form (declare: account, mic/voice, usage analytics, crash data) | store config | S |
| App Tracking Transparency prompt **only if** any tracking SDK is added; otherwise declare no tracking | `expo-tracking-transparency` (conditional) | S |
| Permission strings audited (mic, speech, notifications) — already partly set in `app.json` | `app.json` | S |
| Agent safety: spend/clarity guardrails, "Nexxi can be wrong" disclosure, no medical/financial/legal advice scope note | prompt + UI | S |
| Content & dispute policy for buyer-seller transactions (link to existing refund/report flows) | legal | S |
| GDPR/CCPA data export + deletion path (deletion covered in P4; add export) | `nexez` | M |
| Age rating questionnaire; export-compliance (`ITSAppUsesNonExemptEncryption` already set) | store config | S |

**Exit Gate:** privacy policy live; data-safety forms drafted; account deletion + data export work; permission prompts have correct copy and fire at the right time.

---

### P6 — Quality & Release Engineering 🟡
*Goal: ship confidently and repeatedly.*

| Task | Pkg / Area | Effort |
|------|-----------|--------|
| Unit tests (lib, api-client, reducers) | `jest-expo`, `@testing-library/react-native` | M |
| E2E smoke flows (auth, discover, approve, checkout-return) | Maestro (or Detox) | L |
| Backend tests for new endpoints (orders, push, buyer linkage) | `nexez` vitest | M |
| CI: lint + typecheck + test on PR | GitHub Actions | M |
| CD: EAS Build + Submit pipelines (dev/preview/prod), auto-version | EAS, `eas.json` | M |
| Analytics + funnel events (onboarding→first transaction) | PostHog or Amplitude | M |
| Performance: cold-start, JS bundle size, image caching (`expo-image`), list virtualization | profiling | M |
| Offline/network-state handling + retry queue for turns | `expo-network` / NetInfo | M |
| Real branded assets: icon, splash, adaptive icon, **store screenshots** (all device sizes), preview video | design | M |

**Exit Gate:** green CI on PR; one-command EAS build→submit; analytics dashboard shows the activation funnel; cold start < 2s on mid-tier device; no placeholder assets remain.

---

### P7 — Closed Beta 🟢
*Goal: validate with real users before public exposure.*

| Task | Area |
|------|------|
| TestFlight (external testers) + Play Internal/Closed testing tracks | distribution |
| Beta feedback channel + crash triage loop (Sentry → fix → OTA) | ops |
| Real-money transaction test with live Stripe (small amount, then refund) | e2e |
| Load/abuse test: rate limits, push fan-out, search under volume | ops |
| Beta exit survey: activation, comprehension, trust, willingness to transact | research |

**Exit Gate:** ≥N beta users complete a real transaction; crash-free sessions > 99%; no P0/P1 bugs open; positive comprehension on "what Nexxi does."

---

### P8 — Public Launch 🚀
| Task | Area |
|------|------|
| App Store + Play Store listing copy, keywords, category, screenshots, preview video | store |
| App Store review submission (anticipate 4.8 sign-in, 5.1.1(v) deletion, agent-behavior questions) | review |
| Production EAS submit; staged Play rollout (e.g. 10%→50%→100%) | release |
| Status page / incident runbook; on-call for launch window | ops |
| Marketing site section + deep links / universal links (`apple-app-site-association`, Android assetlinks) | web |
| Support: help center, contact, in-app feedback | support |
| Launch monitoring dashboard (installs, activation, crashes, transaction success rate) | analytics |

**Exit Gate:** app live in both stores; universal/app links resolve; monitoring green; rollback (previous build + OTA) rehearsed.

---

### P9 — Post-Launch & Multi-Platform Expansion (v1.x → v2)
| Theme | Items |
|-------|-------|
| Recommendations from other sources | Second `SourceAdapter`; cross-source comparison; affiliate/recommendation surfacing |
| Shop other platforms (v2) | Adapters for external marketplaces; per-source auth/checkout; unified order timeline |
| Native payments | Apple Pay / Google Pay sheet for Nexez Stripe offers |
| Agent depth | Proactive nudges (price drops, follow-ups), saved searches, budgets, multi-step task memory |
| Growth | Referrals, shareable carts/quotes, web companion |
| Internationalization | Multi-language voice + locale-aware currency |
| iPad / large-screen | Enable `supportsTablet`, responsive layout |

---

## 5. Cross-Cutting Workstreams (tracked across all phases)

- **Security:** SecureStore (P0), RLS for every new table (push tokens, etc.), re-auth gates (P4), prompt-injection suite (P3), no secrets in bundle. Run a security review before P7 and before P8.
- **Backend (nexez) changes required:** push-send on async events, buyer-identity in checkout/negotiation metadata, authenticated orders endpoint, threads list endpoint, semantic search, source-adapter refactor, account-deletion + data-export endpoints, streaming.
- **Design system:** tokens → components → accessibility, maturing from P2 onward.
- **Observability/analytics:** Sentry (P0), product analytics (P6), launch dashboard (P8).

---

## 6. Dependency Install Plan

> Use `npx expo install <pkg>` (resolves SDK 56-correct versions per `AGENTS.md`). Read the versioned Expo docs before wiring each native module.

**P0:** `expo-secure-store` · `@sentry/react-native` · `expo-updates`
**P1:** `expo-notifications` · `expo-speech` · `expo-haptics` *(`expo-web-browser`, `expo-device`, `expo-linking` already installed)*
**P2:** `@tanstack/react-query` · `zustand`
**P4:** `expo-apple-authentication` · `expo-auth-session` (Google)
**P5:** `expo-tracking-transparency` *(only if a tracking SDK is added)*
**P6:** `jest-expo` · `@testing-library/react-native` · Maestro (CLI, not npm) · PostHog/Amplitude SDK · `expo-network`

---

## 7. Launch Readiness Gate (the master checklist)

**Security & data**
- [ ] Tokens in SecureStore; no secrets in bundle
- [ ] RLS verified on every Nexxi table (incl. new push/orders)
- [ ] Account deletion + data export working
- [ ] Security review passed (pre-launch)

**Apple App Store**
- [ ] Sign in with Apple present (social login exists)
- [ ] Account deletion in-app (5.1.1(v))
- [ ] Privacy nutrition label complete & accurate
- [ ] Permission strings correct (mic, speech, notifications)
- [ ] Screenshots (all required sizes) + preview, no placeholder assets
- [ ] Export compliance set

**Google Play**
- [ ] Data Safety form complete
- [ ] Target API level current; adaptive icon set
- [ ] Closed testing completed with required tester count
- [ ] App content / permissions declarations

**Legal**
- [ ] Privacy Policy + Terms hosted & linked
- [ ] Buyer/seller transaction & dispute policy linked (refund/report flows)

**Product / reliability**
- [ ] Full async loop verified on real devices (push → approve → checkout-return → order status)
- [ ] Crash-free sessions > 99% in beta
- [ ] Universal/app links resolve (iOS + Android)
- [ ] Monitoring + rollback rehearsed
- [ ] OTA update channel live

**Quality**
- [ ] CI green (lint/typecheck/test); E2E smoke passing
- [ ] Analytics funnel instrumented

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Apple rejects an "AI agent that spends money" without clear human control | Launch delay | Approval ledger + explicit confirm UX + clear disclosures; document control flow for review |
| Buyer-order linkage misses → orphaned/untracked purchases | Trust/refund issues | P1b is a hard gate; verify e2e both in-app and email portal |
| Voice UX feels slow (2 sequential LLM calls, no stream) | Poor first impression | Streaming + TTS (P3); optimistic UI; keep first response < 90 words |
| Push token / async send unreliable | Core value prop breaks | Backstop cron already exists for negotiations; add retry + delivery logging |
| Semantic search cost/latency at scale | Margin/UX | Hybrid ranking, caching, cap candidate set |
| Multi-platform adapters bolted on late | Costly rewrite | Land the `SourceAdapter` seam in P3 even with one adapter |
| Plaintext tokens exploited pre-fix | Security incident | P0 first item; do before any external build |
| LLM provider choice (currently OpenAI-compatible) | Cost/quality | Abstract behind `llm` config; evaluate Claude (`claude-opus-4-8` / `claude-haiku-4-5`) for the agent loop |

---

## 9. Suggested Execution Order (critical path)

```
P0 (harden) → P1 (close loop) → P2 (surfaces) → P4 (account) → P5 (compliance)
                                   ↘ P3 (backend depth, parallel) ↗
                          P6 (quality/release, parallel from P2) →
                                   P7 (beta) → P8 (launch) → P9 (expand)
```

**Immediate next step (P0, item 1):** migrate Supabase session storage to `expo-secure-store`, then stand up `expo-notifications`. These two convert "demo" into "an app you can safely hand a stranger."
