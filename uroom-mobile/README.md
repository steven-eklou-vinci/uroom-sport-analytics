# Uroom Mobile

Cross-platform mobile app (iOS, Android, tablets) built with Expo + React Native.

## Stack
- React Native + Expo (TypeScript)
- React Navigation (tabs)
- Offline-first storage (SQLite + AsyncStorage queue)
- Media capture scaffolding (ImagePicker, AV)

## Design System
The app matches the web DA (colors, typography) using tokens in:
- `src/theme/colors.ts`
- `src/theme/typography.ts`
- `src/theme/spacing.ts`

## Quick Start

```bash
cd uroom-mobile
npm install
npm run start
```

## API Configuration
Set the API base URL to the same backend used by the web app.
Recommended: use `urroom-api` as the primary backend for shared database access.

```bash
cp .env.example .env
# Update EXPO_PUBLIC_API_URL to your local IP or backend URL
```

Example:
```
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001
EXPO_PUBLIC_AI_URL=http://192.168.1.10:4100
```

AI service for chat widget:
- Run in `uroom-mobile/uroom-ia`
- Start with `GEMINI_API_KEY=your_key npm start`
- Endpoint used by mobile: `EXPO_PUBLIC_AI_URL/assistant/chat`

## Mobile Scope (Phase 1)
- Field capture (fast observation)
- Offline drafts + sync queue
- Media clips (short capture + upload)
- Player list with core metrics
- Shortlists and lightweight player resume
- Consent capture workflow

## Notes
- This app uses the same backend and database as the web app.
- API client: `src/api/client.ts`
