# Nexxi Mobile

Nexxi is the standalone native buyer app for Nexez. Buyers use Nexxi as a personal agent to search the Nexez platform, compare services/products, negotiate terms, and start booking or checkout flows with explicit approval.

> **Name:** the consumer brand is **Nexxi**. `nexie` remains the **internal codename** — the repo (`nexie-mobile`), bundle id (`app.nexez.nexie`), URI scheme (`nexie://`), and backend routes (`/api/agents/nexie`) all keep it on purpose. Only user-visible copy says "Nexxi".

## Stack

- Expo React Native
- TypeScript
- Supabase Auth, shared with Nexez
- Nexxi agent API: `POST /api/agents/nexie`
- Native speech recognition through `expo-speech-recognition`

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env values:

   ```bash
   cp .env.example .env.local
   ```

3. Start development:

   ```bash
   npm run start
   ```

Voice input uses native modules, so use a development build for full iOS/Android testing:

```bash
npx expo run:ios
npx expo run:android
```

## Current MVP

- Email/password auth with the existing Nexez Supabase project
- Text chat with Nexxi
- Native voice-to-text input
- Search result cards
- Approval cards for negotiation and booking actions
- Secure bearer-token calls to the Nexxi backend

## API Contract

The app calls:

```txt
POST https://app.nexez.ai/api/agents/nexie
Authorization: Bearer <supabase_access_token>
```

The backend stores buyer memory and action approvals in Supabase.
