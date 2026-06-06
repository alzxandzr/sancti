-- Migration 0003 — authenticated role grants for direct mobile-client reads/writes
--
-- 0002 granted only to service_role (server-side via SUPABASE_SERVICE_ROLE_KEY).
-- The mobile app talks to Supabase directly via EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
-- which means the signed-in user hits the database as the `authenticated` role
-- (anonymous sign-in upgrades to that role too). RLS policies in 0001 already
-- restrict per-row access via auth.uid() = user_id, but the table-level GRANTs
-- never existed for `authenticated`, so every direct query returned
-- "permission denied for table <name>".
--
-- Grants here exactly match the user-scoped CRUD pattern already enforced by
-- the 0001 RLS policies. Audit-log and cache tables remain service_role-only.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on table public.profiles         to authenticated;
grant select, insert, update, delete on table public.saved_saints     to authenticated;
grant select, insert, update, delete on table public.saved_plans      to authenticated;
grant select, insert, update, delete on table public.plan_days        to authenticated;
grant select, insert, update, delete on table public.plan_prompts     to authenticated;
grant select, insert, update, delete on table public.journal_entries  to authenticated;

-- Users can read their own classification history (RLS-scoped); writes still
-- come from service_role only via the server-side classifier route.
grant select on table public.classifications to authenticated;

-- Default privileges for future user-scoped tables in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
