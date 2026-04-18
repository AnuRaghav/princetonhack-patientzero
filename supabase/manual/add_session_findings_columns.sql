-- Run once in Supabase Dashboard → SQL Editor if you see:
-- "Could not find the 'diagnosis_hypotheses' column of 'sessions' in the schema cache"
--
-- Safe to re-run: uses IF NOT EXISTS.

alter table public.sessions
  add column if not exists discovered_findings jsonb not null default '{}'::jsonb,
  add column if not exists diagnosis_hypotheses jsonb not null default '[]'::jsonb;

-- Ask PostgREST to refresh the schema cache (API layer).
notify pgrst, 'reload schema';
