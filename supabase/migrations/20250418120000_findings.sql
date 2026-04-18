-- AI-SP: structured EncounterFindings projection + diagnosis hypotheses
--
-- Adds two jsonb columns to public.sessions so the app can persist the
-- deterministic projection of "what the student has discovered so far"
-- (read by the future 3D body model) plus an append-only list of student
-- diagnosis submissions. Both default to empty so existing sessions remain
-- valid; the application layer recomputes discovered_findings on every write.

alter table public.sessions
  add column if not exists discovered_findings jsonb not null default '{}'::jsonb,
  add column if not exists diagnosis_hypotheses jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
