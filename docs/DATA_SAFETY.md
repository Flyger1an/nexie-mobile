# Nexxi — Store Data-Safety Declarations

Source-of-truth answers for the **App Store Privacy ("Nutrition Label")** and **Google Play Data Safety** forms. Keep this in sync with [the Privacy Policy](https://nexez.ai/privacy) and the app's actual behavior. Last reviewed: 2026-06-20.

> Not legal advice. The owner enters these in App Store Connect / Play Console and is responsible for accuracy. Re-review whenever a new SDK, permission, or data field is added.

---

## 1. Data inventory (what the app actually handles)

| Data | Collected? | Linked to user? | Why | Notes |
|---|---|---|---|---|
| **Email address** | Yes | Yes | Account, order receipts | From sign-up or Sign in with Apple/Google |
| **Name** | If provided | Yes | Account display | Optional profile metadata |
| **User ID** | Yes | Yes | App functionality | Supabase auth id |
| **Purchase history** | Yes | Yes | Order tracking | What/amount/status. **Card details are NOT collected** — entered on Stripe's hosted checkout |
| **Other user content** | Yes | Yes | Run the buyer agent | Agent chat messages + preferences (budget, categories, timing, free-text location) + voice‑transcribed text |
| **Push token / Device ID** | Yes | Yes | Order notifications | Expo push token; not used for tracking |
| **Crash & performance data** | Opt-in | Yes* | Fix bugs | Via Sentry, DSN-gated; *mark Not-Linked only if no user id is attached |
| **Audio / voice recordings** | **No** | — | — | OS speech service transcribes to text on-device; **no audio stored or transmitted**. Mic permission is transient |
| **Precise/coarse location** | **No** | — | — | No location permission. The "location" preference is free text the user types → counts as User Content, not device location |
| **Contacts, photos, health, financial account #s** | **No** | — | — | Never accessed |

**Global facts:** Data is **encrypted in transit** (TLS). **No data is sold.** **No tracking** across other companies' apps/sites → **no App Tracking Transparency prompt**, no advertising identifiers. Users can **delete** their account + data in-app (Profile → Delete account) and **export** it (Profile → Export my data).

---

## 2. Apple — App Privacy (App Store Connect → App Privacy)

For each type below: Data is **collected**, **linked to the user**, used for **App Functionality** only, and **NOT used for tracking**.

- **Contact Info → Email Address** (and **Name** if a buyer sets one)
- **Identifiers → User ID**, **Device ID** (push token)
- **Purchases → Purchase History**
- **User Content → Other User Content** (agent messages + preferences)
- **Diagnostics → Crash Data, Performance Data** — only if Sentry is enabled for the build; choose *Not Linked* if no user identifier is sent to Sentry, else *Linked*

Do **NOT** declare: Audio, Location, Browsing/Search History (the search queries are app-functional, not retained as a browsing profile), Health, Financial Info (no card data touches the app).

**Other App Store Connect fields**
- Account creation required: **Yes**
- **Account deletion** offered in-app: **Yes** → point the "account deletion" URL/instructions at Profile → Delete account (also https://nexez.app via the dashboard).
- Tracking (ATT): **No**.

---

## 3. Google Play — Data Safety (Play Console → App content → Data safety)

**Overview answers**
- Does your app collect or share user data? **Yes**
- Is all data **encrypted in transit**? **Yes**
- Do you provide a way to **request data deletion**? **Yes** — in-app (Profile → Delete account); deletion URL: https://nexez.ai/privacy (describes the in-app path). Also offer export.
- Committed to Play **Families policy**? Only if targeting children — **we are not** (see §4).

**Data types — collected (not "shared" except via processors), purpose: App functionality; some Analytics for diagnostics**

| Play category | Type | Collected | Processing purpose |
|---|---|---|---|
| Personal info | Email address | Yes | App functionality, Account management |
| Personal info | Name | Yes (optional) | App functionality |
| Personal info | User IDs | Yes | App functionality |
| Financial info | Purchase history | Yes | App functionality |
| Messages | Other in-app messages | Yes | App functionality (agent requests) |
| App activity | App interactions / other user-generated content (preferences) | Yes | App functionality |
| Device/other IDs | Device or other IDs (push token) | Yes | App functionality (notifications) |
| App info & performance | Crash logs, Diagnostics | Yes (opt-in) | App functionality, Analytics |

**Mark each as "Collected." Mark "Shared" only for data that leaves to a third party that is NOT acting purely as your processor.** Supabase/Expo/Sentry/the LLM provider/Brave act as processors on our behalf → typically **not** "shared" under Play's definition; Stripe payments occur on Stripe's own surface. Confirm against Play's current definitions before submitting.

Do **NOT** declare: Location, Audio, Photos/Videos, Contacts, Health, Browsing history.

**Third-party SDK disclosure:** Sentry (crash/diagnostics, opt-in), Expo (updates + push delivery).

---

## 4. Tricky points (defensible rationale)

- **Microphone but no Audio collection.** We request mic permission, but the OS speech recognizer returns *text*; we never persist or transmit audio. So Audio = *not collected*; the resulting text is User Content. iOS strings already set: `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`.
- **Payments.** Card/bank data is entered on **Stripe's hosted checkout**, not in the app → no Financial *account* info collected. We do retain **purchase history** (item, amount, status) → declared.
- **Location.** No location permission/SDK. A user may *type* a city as a buyer preference → that's free-text User Content, not device location.
- **Search queries.** Sent to the LLM (and, if enabled, Brave) to fulfill the request; not retained as a browsing/search profile → not "Browsing History."
- **No tracking / no ads.** No advertising IDs, no cross-app tracking, no data sale → no ATT prompt, Play "data shared for advertising" = No.

---

## 5. Pre-submission checklist

- [ ] Apple App Privacy completed per §2; Account-deletion path declared.
- [ ] Play Data Safety completed per §3; deletion + encryption-in-transit = Yes.
- [ ] Privacy Policy URL (https://nexez.ai/privacy) set in **both** store listings.
- [ ] In-app links present (Profile → Legal). ✅ shipped
- [ ] In-app account deletion present. ✅ shipped
- [ ] In-app data export present. ✅ shipped
- [ ] If Sentry ships in the production build, decide Crash-data *Linked vs Not-Linked* and match §2/§3.
- [ ] Age rating questionnaire answered consistently with §4 (not directed at children).
