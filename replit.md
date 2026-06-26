# EngliFly

An AI-powered English learning app with chat tutoring, voice practice, and stranger chat for conversational practice.

## Run & Operate

- Workflow `artifacts/englifly: web` — runs the frontend (Vite dev server)
- `pnpm --filter @workspace/englifly run dev` — run frontend manually
- `pnpm run typecheck` — full typecheck across all packages
- Required env (Firebase): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Required env (AI): `VITE_OPENAI_API_KEY`
- Without Firebase env vars, app runs in mock/demo mode automatically

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS v4, wouter (routing)
- Auth + DB: Firebase Auth + Firestore (with localStorage mock fallback)
- AI: OpenAI API called directly from browser via `VITE_OPENAI_API_KEY`
- UI: shadcn/ui components (Radix UI), framer-motion, lucide-react

## Where things live

- `artifacts/englifly/src/` — main frontend source
- `artifacts/englifly/src/App.tsx` — routing + providers
- `artifacts/englifly/src/pages/` — all page components
- `artifacts/englifly/src/lib/firebase.ts` — Firebase config (gracefully degrades without env vars)
- `artifacts/englifly/src/lib/api.ts` — data layer (localStorage + OpenAI hooks)
- `artifacts/englifly/src/lib/mockAuth.ts` — mock auth for demo mode
- `artifacts/englifly/src/index.css` — theme (Telegram-style blue, Inter font, custom animations)
- `artifacts/englifly/public/` — static assets (icons, robots.txt)

## Architecture decisions

- Firebase optional: `isFirebaseConfigured` guards all Firebase calls; falls back to localStorage mock auth so the app is previewable without secrets.
- OpenAI called from browser: `VITE_OPENAI_API_KEY` used directly in `src/lib/api.ts` mutations — no backend proxy needed for the current design.
- vite-plugin-pwa dropped: PWA manifest/service-worker from the original Vercel build was not ported (not supported in Replit scaffold); PWA meta tags remain in `index.html`.
- No Express API routes: this app is purely frontend + Firebase/OpenAI; the `artifacts/api-server` scaffold exists but is unused.

## Product

- AI chat tutor: pick an English level, chat with an AI teacher, get corrections and vocabulary help
- Voice mode: microphone-based conversation practice using the Web Speech API
- Stranger chat: anonymous real-time chat with other learners via Firestore
- Onboarding, subscription, and settings screens

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- App works in demo mode without Firebase/OpenAI keys — mock user is auto-signed in.
- To enable real auth and AI, add all `VITE_FIREBASE_*` and `VITE_OPENAI_API_KEY` secrets.
- vite-plugin-pwa is NOT installed — do not add it without updating vite.config.ts carefully.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
