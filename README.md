# Sancti

Sancti is a Catholic saint-matching and devotional planning app. Users describe their current life situation, Sancti classifies intent into a pastoral route, suggests relevant saints, and creates a personalized 5–7 day devotional reflection plan — with theological and safety guardrails.

The whole project is a single Expo Router app: the same codebase ships to web (Vercel), iOS, and Android. API routes are co-located in `app/api/` and execute as serverless functions in production.

## Tech Stack

- **Frontend (web + native):** Expo Router 6 + React Native + react-native-web
- **API routes:** Expo Router `+api.ts` files, deployed as Vercel Functions via `@expo/server/adapter/vercel`
- **Database:** Supabase (Postgres, pgvector-ready)
- **AI:** Google Gemini (`@google/genai`)
- **Liturgical Calendar:** LiturgicalCalendarAPI
- **Validation:** Zod

## Folder Structure

- `app/` — Expo Router screens (web + native). `app/api/*+api.ts` are server routes.
- `api/` — Single Vercel Function entry that fronts Expo Router (`@expo/server/adapter/vercel`).
- `server/` — Server-only code, imported by `app/api/*+api.ts`:
  - `server/handlers/` — handler bodies (classify, generate-plan, match-saints, profile, saint, saints, liturgical)
  - `server/lib/` — Gemini client, validator, safety, citations, env loader, rate limiter, Next-style adapter
  - `server/prompts/` — base + classifier + per-route system prompts
  - `server/data/` — saints, mappings, situations, scripture books, crisis resources (static JSON)
  - `server/types/` — shared TypeScript contracts
- `components/`, `theme/` — UI primitives shared by every screen
- `lib/` — client-side utilities (api wrapper, supabase client, profile/journal/saved-saints persistence)
- `tests/` — `tsx --test` suite (mocked Gemini SDK)
- `scripts/llm-smoke.ts` — live smoke for the LLM pipeline (run manually with a real `GEMINI_API_KEY`)
- `supabase/migrations/` — SQL migrations

## Local Development

```bash
npm install
# Create .env.local (gitignored). At minimum:
#   EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the client
#   GEMINI_API_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for the API routes
# See .env.example.

npm run web        # web dev server (http://localhost:8081)
npm start          # Metro dev server for native (iOS/Android via Expo Go)
npm run typecheck
npm test
```

## Deploy

Web + API land in a single Vercel project. The repo root IS the project root — no monorepo, no nested deploy directory.

1. Push the repo to GitHub and link it in Vercel (or `vercel link` from the repo root).
2. Configure environment variables (Project Settings → Environment Variables). Server-only values must never be exposed to the client:
   - `GEMINI_API_KEY` *(required for live LLM calls; routes degrade to keyword fallback when absent)*
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` *(profile persistence; profile route uses in-memory store when absent)*
   - `GEMINI_MODEL_CLASSIFY`, `GEMINI_MODEL_SAFETY`, `GEMINI_MODEL_PLAN`, `GEMINI_MODEL_PLAN_FALLBACK` *(optional model pins)*
   - `LITCAL_API_BASE` *(optional)*
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` *(client-side Supabase access)*
   - `SENTRY_DSN`, `POSTHOG_API_KEY`, `LOG_LEVEL` *(optional)*
3. Push to `main`. Vercel runs `expo export -p web` (per `vercel.json`), produces `dist/client` for static assets, and registers a single Function at `api/index.ts` that dispatches every request through the Expo Router server build in `dist/server`.

### Mobile (iOS / Android)

Builds run through EAS (`eas.json` already configured). The native app talks to the same API as the web — point `EXPO_PUBLIC_API_BASE_URL` at the deployed Vercel URL.

### Supabase migration

Apply migrations against your Supabase project (Supabase SQL editor or `supabase db push`):

- `0001_init.sql` — schema (11 tables) + RLS + auth trigger
- `0002_service_role_grants.sql` — table-level grants for server-side writes
- `0003_authenticated_grants.sql` — grants for the `authenticated` role so the mobile client can read/write its own rows with the publishable key

## Rate limiting

`server/lib/rate-limit.ts` applies a per-IP token bucket (8/min, burst 8) to `/api/classify` and `/api/generate-plan`. In-memory, so it resets on serverless cold start — fine as a basic abuse shield. Upstash-Redis-backed bucket is the upgrade path.

## Guardrails

- Never impersonate a saint, priest, Jesus, Mary, or spiritual director.
- Never simulate sacraments, confession, or absolution.
- Never invent quotations or unverified historical facts.
- Generated content is labeled `devotional_reflection`, not Church teaching.
- Crisis/concern severity short-circuits to `SAFETY_REVIEW`, which surfaces crisis resources instead of a plan.

## Notes

Portfolio / learning project. Not an official pastoral or theological authority. Generated content carries a teaching-authority disclaimer.
