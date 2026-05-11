-- Migration 0002 — service_role table grants
--
-- 0001_init.sql enabled RLS on every table and relied on service_role
-- bypassing RLS to perform server-side writes. That bypass requires
-- table-level grants which were missing, so any API call through
-- handlers/profile.ts surfaced "permission denied for table <name>".
-- This migration grants the API access pattern documented in 0001:
--   * User-owned tables: SELECT/INSERT/UPDATE/DELETE.
--   * Audit-log tables (safety_events / classifications / llm_calls):
--     SELECT and INSERT only — append-only by design.
--   * Cache tables: full CRUD.

grant usage on schema public to service_role;

-- User-owned (full CRUD).
grant select, insert, update, delete on table public.profiles         to service_role;
grant select, insert, update, delete on table public.saved_saints     to service_role;
grant select, insert, update, delete on table public.saved_plans      to service_role;
grant select, insert, update, delete on table public.plan_days        to service_role;
grant select, insert, update, delete on table public.plan_prompts     to service_role;
grant select, insert, update, delete on table public.journal_entries  to service_role;

-- Audit logs (append + read, never mutate/delete).
grant select, insert on table public.safety_events    to service_role;
grant select, insert on table public.classifications  to service_role;
grant select, insert on table public.llm_calls        to service_role;

-- Caches (full CRUD).
grant select, insert, update, delete on table public.generated_content_cache to service_role;
grant select, insert, update, delete on table public.liturgical_cache        to service_role;

-- Future tables created in this schema by later migrations should default to
-- granting the same access pattern to service_role; explicit grants in each
-- migration are still preferred so the intent is reviewable per change.
alter default privileges in schema public
  grant select, insert, update on tables to service_role;
