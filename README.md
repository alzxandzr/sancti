# Sancti

Sancti is a Catholic saint-matching and devotional planning app. Users describe their current life situation, Sancti classifies intent into a pastoral route, suggests relevant saints, and creates a personalized 5–7 day devotional reflection plan — with theological and safety guardrails.

The repo is structured as a Next.js web app at the root (deployable to Vercel) plus a sibling Expo mobile app under `mobile/`. Both share the same `lib/`, `prompts/`, `data/`, and `types/`.

## Tech Stack
- **Web:** Next.js (Pages Router), React, TypeScript
- **Mobile:** React Native with Expo (TypeScript) — under `mobile/`
- **Database:** Supabase (Postgres, pgvector-ready)
- **AI:** Anthropic Claude API
- **Liturgical Calendar:** LiturgicalCalendarAPI
- **Validation:** Zod

## Folder Structure
- `pages/` — Next.js routes (landing page + thin `pages/api/*` re-exports)
- `api/` — API handler bodies (kept here while we delay an App Router migration)
- `lib/` — shared clients, validator, safety, citations, env loader
- `prompts/` — base prompt, classifier prompt, route prompts
- `data/` — saints, situations, mappings, scripture books, crisis resources
- `types/` — shared TypeScript types
- `supabase/migrations/` — SQL migrations (see Deploy section)
- `tests/` — `tsx --test` suite (mocked Anthropic SDK)
- `mobile/` — Expo client (its own `package.json`; not part of the web deploy)

## Local Development
```bash
npm install
cp .env.example .env       # fill in ANTHROPIC_API_KEY, SUPABASE_* etc.
npm run dev                # http://localhost:3000
npm run typecheck
npm test
```

The landing page at `/` posts to `/api/classify → /api/match-saints → /api/generate-plan` for an end-to-end demo.

## Deploy to Vercel

1. Push the repo to GitHub and "Add New… → Project" in Vercel. Pick the repo; the framework preset auto-detects as Next.js.
2. Configure environment variables (Project Settings → Environment Variables). These are server-only — never expose to the browser:
   - `ANTHROPIC_API_KEY` *(required)*
   - `SUPABASE_URL` *(enables profile persistence; if absent the profile route uses an in-memory store)*
   - `SUPABASE_SERVICE_ROLE_KEY` *(required when `SUPABASE_URL` is set)*
   - `ANTHROPIC_MODEL_CLASSIFY`, `ANTHROPIC_MODEL_SAFETY`, `ANTHROPIC_MODEL_PLAN` *(optional — pin a model revision)*
   - `LITCAL_API_BASE` *(optional — overrides the default LiturgicalCalendarAPI)*
   - `SENTRY_DSN`, `POSTHOG_API_KEY` *(optional, observability)*
   - `LOG_LEVEL` *(optional, default `info`)*
3. The `EXPO_PUBLIC_*` values in `.env.example` are for the **mobile** build only; the Vercel web deploy does not need them.
4. Push to `main`; Vercel runs `npm run build`. The build log will list four dynamic `/api/*` routes plus the static landing page.

### Supabase migration

To enable real profile persistence, deploy the schema in `supabase/migrations/0001_init.sql` against your Supabase project. Either run it from the Supabase SQL editor or, with the Supabase CLI:

```bash
supabase db push
```

RLS is enabled on every user-scoped table; service-role writes from the API routes bypass RLS as expected.

## Rate limiting / abuse note

The `/api/classify` and `/api/generate-plan` routes call paid Anthropic models. There is no rate-limiting middleware in this repo yet — for a public deploy you should at minimum:

- Add a per-IP token bucket (e.g. `@upstash/ratelimit` + Upstash Redis, or Vercel's edge rate-limit rules).
- Or require a demo API key header on expensive routes and rotate it.

Tracking this as a Phase-5 hardening task.

## Environment Variables
See `.env.example` for the full list with placeholders.

## Notes
This project is a portfolio/learning project and is not an official pastoral or theological authority. Generated content is labeled `devotional_reflection` and ships with a teaching-authority disclaimer.
