# Sancti

Sancti is a Catholic saint-matching and devotional planning app. Users describe their current life situation, Sancti classifies intent into a pastoral route, suggests relevant saints, and creates a personalized 5–7 day devotional reflection plan.

## Tech Stack
- **Frontend:** React Native with Expo (TypeScript)
- **Backend:** Next.js API routes (TypeScript)
- **Database:** Supabase (Postgres, pgvector-ready)
- **AI:** Anthropic Claude API
- **Liturgical Calendar:** LiturgicalCalendarAPI
- **Validation:** Zod

## Folder Structure (Summary)
- `app/`: Expo screens (`index`, `intake`, `results`, `saint/[id]`, `plan`, `today`)
- `api/`: API routes (`classify`, `match-saints`, `generate-plan`)
- `lib/`: shared clients and validator helpers
- `prompts/`: base prompt, classifier prompt, route prompts
- `data/`: saints, situations, mappings seed data
- `types/`: shared TypeScript types

## Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy and configure environment values:
   ```bash
   cp .env.example .env
   ```
4. Validate scaffold:
   ```bash
   npm run typecheck
   npm test
   ```

## Environment Variables
See `.env.example` for placeholders:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LITCAL_API_BASE`

## Notes
This project is a portfolio/learning project and is not an official pastoral or theological authority.
