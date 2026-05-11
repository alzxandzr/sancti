# Sancti

Sancti is a Catholic saint-matching and devotional planning app. Users describe their current life situation, Sancti classifies intent into a pastoral route, suggests relevant saints, and creates a personalized 5–7 day devotional reflection plan — with theological and safety guardrails.

The repo is structured as a Next.js web app at the root (deployable to Vercel) plus a sibling Expo mobile app under `mobile/`. Both share the same `lib/`, `prompts/`, `data/`, and `types/`.

## Tech Stack
- **Web:** Next.js (Pages Router), React, TypeScript
- **Mobile:** React Native with Expo (TypeScript) — under `mobile/`
- **Database:** Supabase (Postgres, pgvector-ready)
- **AI:** Google Gemini API (`@google/genai`)
- **Liturgical Calendar:** LiturgicalCalendarAPI
- **Validation:** Zod

## Folder Structure
- `pages/` — Next.js routes (landing page + thin `pages/api/*` re-exports)
- `handlers/` — API handler bodies (kept outside `pages/api/` so Vercel doesn't auto-detect them as standalone serverless functions alongside the Next.js routes)
- `lib/` — shared clients, validator, safety, citations, env loader
- `prompts/` — base prompt, classifier prompt, route prompts
- `data/` — saints, situations, mappings, scripture books, crisis resources
- `types/` — shared TypeScript types
- `supabase/migrations/` — SQL migrations (see Deploy section)
- `tests/` — `tsx --test` suite (mocked Gemini SDK)
- `mobile/` — Expo client (its own `package.json`; not part of the web deploy)

## Local Development
```bash
npm install
# Create .env.local (gitignored) with at minimum GEMINI_API_KEY.
# Optional: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for profile persistence,
# and EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the
# mobile bundle. See "Environment Variables" below.
npm run dev                # http://localhost:3000
npm run typecheck
npm test
```

The landing page at `/` posts to `/api/classify → /api/match-saints → /api/generate-plan` for an end-to-end demo.

## Deploy to Vercel

1. Push the repo to GitHub and "Add New… → Project" in Vercel. Pick the repo; the framework preset auto-detects as Next.js.
2. Configure environment variables (Project Settings → Environment Variables). These are server-only — never expose to the browser:
   - `GEMINI_API_KEY` *(required — free tier key from https://aistudio.google.com/apikey)*
   - `SUPABASE_URL` *(enables profile persistence; if absent the profile route uses an in-memory store)*
   - `SUPABASE_SERVICE_ROLE_KEY` *(required when `SUPABASE_URL` is set)*
   - `GEMINI_MODEL_CLASSIFY`, `GEMINI_MODEL_SAFETY`, `GEMINI_MODEL_PLAN` *(optional — pin a model revision)*
   - `LITCAL_API_BASE` *(optional — overrides the default LiturgicalCalendarAPI)*
   - `SENTRY_DSN`, `POSTHOG_API_KEY` *(optional, observability)*
   - `LOG_LEVEL` *(optional, default `info`)*
3. The `EXPO_PUBLIC_*` values are for the **mobile** build only; the Vercel web deploy does not need them.
4. Push to `main`; Vercel runs `npm run build`. The build log will list four dynamic `/api/*` routes plus the static landing page.

### Supabase migration

To enable real profile persistence, deploy the schema in `supabase/migrations/0001_init.sql` against your Supabase project. Either run it from the Supabase SQL editor or, with the Supabase CLI:

```bash
supabase db push
```

RLS is enabled on every user-scoped table; service-role writes from the API routes bypass RLS as expected.

## Rate limiting / abuse note

The `/api/classify` and `/api/generate-plan` routes call Gemini. The free tier has generous per-day limits but you can still get charged once you exceed them and there is no rate-limiting middleware in this repo yet — for a public deploy you should at minimum:

- Add a per-IP token bucket (e.g. `@upstash/ratelimit` + Upstash Redis, or Vercel's edge rate-limit rules).
- Or require a demo API key header on expensive routes and rotate it.

Tracking this as a Phase-5 hardening task.

## Environment Variables

Server-side (Next.js API routes / EAS build — never bundled into mobile):

- `GEMINI_API_KEY` — optional locally (falls back to keyword classification + Psalm 23 plan)
- `GEMINI_MODEL_CLASSIFY` / `GEMINI_MODEL_SAFETY` / `GEMINI_MODEL_PLAN` — override defaults in `lib/env.ts`
- `SUPABASE_URL` — optional; profile route uses in-memory store when unset
- `SUPABASE_SERVICE_ROLE_KEY` — required when `SUPABASE_URL` is set
- `LITCAL_API_BASE` — defaults to LiturgicalCalendarAPI
- `SENTRY_DSN`, `POSTHOG_API_KEY` — optional in dev, required in prod
- `LOG_LEVEL` (default `info`), `NODE_ENV` (default `development`)

Public / mobile (bundled into Expo app — safe-to-ship values only):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the modern `sb_publishable_…` form)
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_API_KEY` — optional

## Notes
This project is a portfolio/learning project and is not an official pastoral or theological authority. Generated content is labeled `devotional_reflection` and ships with a teaching-authority disclaimer.
