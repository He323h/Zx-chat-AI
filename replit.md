# EngliFly (ZX-Chat AI)

An AI-powered English learning app with chat tutoring, voice practice, and stranger chat for conversational practice.

## Run & Operate

- Workflow `Start application` — runs both the frontend (Vite, port 5000) and API server (Express, port 3001) in parallel
- `pnpm --filter @workspace/englifly run dev` — run frontend manually
- `pnpm --filter @workspace/api-server run dev` — run API server manually
- `pnpm run typecheck` — full typecheck across all packages

## Required Secrets

- `GEMINI_API_KEY` — Google Gemini API key for AI chat tutoring (server-side only, never exposed to browser)
- Firebase keys are **optional** — app runs in demo/mock mode without them (see below)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS v4, wouter (routing)
- Auth: Firebase Auth (optional) with localStorage mock fallback — app works without Firebase keys
- AI: Gemini 2.5 Flash called **server-side** via Express backend (`artifacts/api-server`)
- DB: Firebase Firestore (optional, for Stranger Chat feature only)
- UI: shadcn/ui components (Radix UI), framer-motion, lucide-react

## Where things live

- `artifacts/englifly/src/` — main frontend source
- `artifacts/englifly/src/App.tsx` — routing + providers
- `artifacts/englifly/src/pages/` — all page components
- `artifacts/englifly/src/lib/firebase.ts` — Firebase config (gracefully degrades without env vars)
- `artifacts/englifly/src/lib/api.ts` — data layer (localStorage hooks)
- `artifacts/englifly/src/lib/mockAuth.ts` — mock auth for demo mode
- `artifacts/englifly/src/contexts/AuthContext.tsx` — auth context (uses mock when Firebase not configured)
- `artifacts/api-server/src/routes/chat.ts` — Gemini AI chat endpoint (`POST /api/chat`)
- `artifacts/englifly/src/index.css` — theme (blue, Inter font, custom animations)

## Architecture decisions

- **AI is server-side**: Gemini is called from `artifacts/api-server` — never from the browser. The `GEMINI_API_KEY` secret is server-only.
- **Firebase optional**: `isFirebaseConfigured` guards all Firebase calls; falls back to localStorage mock auth so the app works in demo mode without secrets.
- **Stranger Chat requires Firestore**: The real-time stranger chat feature needs Firebase Firestore. It shows a "not configured" state without Firebase keys.
- **No PWA**: vite-plugin-pwa is not installed.

## Product

- AI chat tutor: pick an English level, chat with an AI teacher, get corrections and vocabulary help
- Voice mode: microphone-based conversation practice using the Web Speech API
- Stranger chat: anonymous real-time chat with other learners via Firestore (requires Firebase)
- Onboarding, subscription, and settings screens

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- App works in demo mode without Firebase/Gemini keys — mock user is auto-signed in, AI chat shows error without key.
- To enable real auth: add all `VITE_FIREBASE_*` secrets (optional).
- To enable AI chat: `GEMINI_API_KEY` must be set in Replit Secrets (already done).
- `vite-plugin-pwa` is NOT installed — do not add it without updating vite.config.ts carefully.
- The API server reads `GEMINI_API_KEY` (and falls back to `GEMINI_API_KEY_1`/`GEMINI_API_KEY_2` for multi-key setups).
