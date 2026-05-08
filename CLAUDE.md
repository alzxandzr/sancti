# Sancti

Sancti is a Catholic saint-matching and devotional planning app that helps users describe their current situation, routes that input to a pastoral intent category, surfaces relevant saints, and generates structured 5–7 day devotional reflections with clear safety and theological guardrails.

## Current Phase
Phase 1: Scaffolding

## Tech Stack
- Frontend: React Native with Expo (TypeScript)
- Backend: Next.js-style API routes (TypeScript)
- Database: Supabase (Postgres, pgvector-ready)
- AI: Anthropic Claude API
- Liturgical Calendar: LiturgicalCalendarAPI
- Validation: Zod

## Folder Map
- `app/` mobile screens
- `api/` classification, saint matching, and plan generation routes
- `lib/` client setup and schema validation utilities
- `prompts/` base, classifier, and per-route prompt templates
- `data/` saints, situations, and weighted mappings
- `types/` shared TypeScript contracts

## Feature Roadmap
- **Phase 1 (Scaffolding):** project structure, core contracts, starter data, prompt scaffolding, guardrails.
- **Phase 2 (Data + Routing):** connect Supabase, robust classifier, saint ranking logic, route confidence handling.
- **Phase 3 (Plan Generation):** LLM-backed devotional plans, source attribution, richer route-specific prompt formatting.
- **Phase 4 (Experience):** onboarding polish, today habit flow, saved plans, analytics, quality review.
- **Phase 5 (Safety + Reliability):** stronger safety triage, moderation checks, observability, test coverage hardening.

## Guardrails Summary
- Never impersonate a saint, priest, Jesus, Mary, or spiritual director.
- Never simulate sacraments, confession, or absolution.
- Never invent quotations or unverified historical facts.
- Label generated content as devotional reflection, not official Church teaching.
- If SAFETY_REVIEW is triggered, return a safety note instead of a normal devotion plan.
