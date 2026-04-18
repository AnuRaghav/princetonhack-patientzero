-- AI-SP core schema (Postgres / Supabase)
-- Hackathon note: Route Handlers use the service role key. Clients should not query these tables directly in production.

create extension if not exists "pgcrypto";

-- Profiles mirror auth.users for display metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id text primary key,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  case_id text not null references public.cases (id) on delete restrict,
  status text not null default 'active',
  emotional_state text not null default 'anxiety',
  pain_level int not null default 4,
  revealed_facts jsonb not null default '[]'::jsonb,
  completed_exam_actions jsonb not null default '[]'::jsonb,
  discovered_findings jsonb not null default '{}'::jsonb,
  diagnosis_hypotheses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_case_id_idx on public.sessions (case_id);
create index if not exists sessions_user_id_idx on public.sessions (user_id);

create table if not exists public.transcript_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  speaker text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transcript_session_idx on public.transcript_turns (session_id, created_at);

create table if not exists public.exam_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  action_type text not null,
  target text not null,
  finding_key text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists exam_events_session_idx on public.exam_events (session_id, created_at);

create table if not exists public.score_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  checklist_score int not null,
  empathy_score int not null,
  diagnostic_score int not null,
  summary text not null,
  misses jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists score_reports_session_idx on public.score_reports (session_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.sessions enable row level security;
alter table public.transcript_turns enable row level security;
alter table public.exam_events enable row level security;
alter table public.score_reports enable row level security;

-- No broad anon policies: server uses service role for MVP demos.
