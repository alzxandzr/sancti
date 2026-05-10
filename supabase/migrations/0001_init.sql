-- Sancti initial schema
-- Migration 0001
--
-- Tables:
--   profiles                — 1:1 with auth.users
--   saved_saints            — user favourites
--   saved_plans             — header for a 5-7 day devotional plan
--   plan_days               — one row per day in a plan
--   plan_prompts            — one row per devotional prompt within a day
--   journal_entries         — user-authored reflections tied to a prompt
--   safety_events           — safety triage audit log (always written)
--   classifications         — LLM classifier observations (cost/quality)
--   llm_calls               — generic LLM call log for cost auditing
--   generated_content_cache — service-only plan cache keyed by hash
--   liturgical_cache        — daily liturgical context cache
--
-- Conventions:
--   * gen_random_uuid() requires pgcrypto.
--   * RLS enabled on every user-scoped table; policy is auth.uid() = user_id.
--   * Service-role only tables (caches) have RLS enabled with no public policies.

create extension if not exists pgcrypto;

-- ─── profiles ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{
    "state_in_life": "other",
    "preferred_tone": "gentle",
    "prayer_duration_minutes": 10
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert profile row on signup (trigger on auth.users).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── saved_saints ────────────────────────────────────────────────────────
create table if not exists public.saved_saints (
  user_id uuid references auth.users(id) on delete cascade,
  saint_id text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, saint_id)
);

-- ─── saved_plans + plan_days + plan_prompts ──────────────────────────────
create table if not exists public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null check (route in (
    'VOCATION_DISCERNMENT','SUFFERING_HARDSHIP','RELATIONSHIPS_FAMILY',
    'WORK_PURPOSE','GENERAL_GUIDANCE','SAFETY_REVIEW'
  )),
  classification jsonb not null,
  saint_ids text[] not null,
  total_days int not null check (total_days between 5 and 7),
  current_day_index int not null default 0 check (current_day_index >= 0),
  liturgical_snapshot jsonb,
  content_label text not null default 'devotional_reflection',
  teaching_authority_note text,
  pastoral_escalation jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists saved_plans_user_created_idx
  on public.saved_plans (user_id, created_at desc);

create table if not exists public.plan_days (
  plan_id uuid not null references public.saved_plans(id) on delete cascade,
  day_index int not null check (day_index between 0 and 6),
  date_target date,
  theme text not null,
  liturgical_note text,
  primary key (plan_id, day_index)
);

create table if not exists public.plan_prompts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.saved_plans(id) on delete cascade,
  day_index int not null check (day_index between 0 and 6),
  ordinal int not null check (ordinal between 0 and 9),
  type text not null check (type in ('reflection','prayer','journal','practice')),
  title text not null,
  body text not null,
  citations jsonb not null,
  estimated_minutes int check (estimated_minutes between 2 and 60)
);
create index if not exists plan_prompts_plan_day_ordinal_idx
  on public.plan_prompts (plan_id, day_index, ordinal);

-- ─── journal_entries ─────────────────────────────────────────────────────
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid references public.plan_prompts(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists journal_entries_user_created_idx
  on public.journal_entries (user_id, created_at desc);

-- ─── safety_events ───────────────────────────────────────────────────────
create table if not exists public.safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  trigger text not null check (trigger in (
    'input_prescreen','classifier_route','output_banlist',
    'citation_rejected','prompt_injection'
  )),
  severity text not null check (severity in ('none','concern','crisis','info','warn','critical')),
  route_at_trigger text,
  detail jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists safety_events_severity_created_idx
  on public.safety_events (severity, created_at desc);

-- ─── classifications + llm_calls ─────────────────────────────────────────
create table if not exists public.classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  model text not null,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  created_at timestamptz not null default now()
);
create index if not exists classifications_user_created_idx
  on public.classifications (user_id, created_at desc);

create table if not exists public.llm_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null,                     -- 'classify' | 'safety' | 'plan' | 'other'
  model text not null,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  cache_creation_tokens int,
  retries int not null default 0,
  ok boolean not null,
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists llm_calls_purpose_created_idx
  on public.llm_calls (purpose, created_at desc);

-- ─── generated_content_cache (service-only) ──────────────────────────────
create table if not exists public.generated_content_cache (
  cache_key text primary key,
  plan jsonb not null,
  hits int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── liturgical_cache (service-only) ─────────────────────────────────────
create table if not exists public.liturgical_cache (
  date date primary key,
  context jsonb not null,
  created_at timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────

alter table public.profiles                enable row level security;
alter table public.saved_saints            enable row level security;
alter table public.saved_plans             enable row level security;
alter table public.plan_days               enable row level security;
alter table public.plan_prompts            enable row level security;
alter table public.journal_entries         enable row level security;
alter table public.safety_events           enable row level security;
alter table public.classifications         enable row level security;
alter table public.llm_calls               enable row level security;
alter table public.generated_content_cache enable row level security;
alter table public.liturgical_cache        enable row level security;

-- profiles: users see only their own row
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = user_id);
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_saints
create policy saved_saints_self_all on public.saved_saints
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_plans
create policy saved_plans_self_all on public.saved_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- plan_days: scoped via plan_id -> saved_plans.user_id
create policy plan_days_self_all on public.plan_days
  for all using (
    exists (select 1 from public.saved_plans p
            where p.id = plan_days.plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.saved_plans p
            where p.id = plan_days.plan_id and p.user_id = auth.uid())
  );

-- plan_prompts: same scoping
create policy plan_prompts_self_all on public.plan_prompts
  for all using (
    exists (select 1 from public.saved_plans p
            where p.id = plan_prompts.plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.saved_plans p
            where p.id = plan_prompts.plan_id and p.user_id = auth.uid())
  );

-- journal_entries
create policy journal_entries_self_all on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- classifications: users can read their own; service-role inserts.
create policy classifications_self_select on public.classifications
  for select using (auth.uid() = user_id);

-- safety_events / llm_calls / caches: service-role only (no public policies).
-- Leaving RLS enabled with zero policies means all client access denied,
-- service-role bypasses RLS by design.
