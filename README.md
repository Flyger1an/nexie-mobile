# Nexie Mobile

Nexie is the standalone native buyer app for Nexez. Buyers use Nexie as a personal agent to search the Nexez platform, compare services/products, negotiate terms, and start booking or checkout flows with explicit approval.

## Stack

- Expo React Native
- TypeScript
- Supabase Auth, shared with Nexez
- Nexie agent API: `POST /api/agents/nexie`
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
- Text chat with Nexie
- Native voice-to-text input
- Search result cards
- Approval cards for negotiation and booking actions
- Secure bearer-token calls to the Nexie backend

## API Contract

The app calls:

```txt
POST https://app.nexez.ai/api/agents/nexie
Authorization: Bearer <supabase_access_token>
```

The backend stores buyer memory and action approvals in Supabase.
