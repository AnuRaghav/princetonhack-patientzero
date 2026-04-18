# AI-SP (hackathon MVP)

AI-SP is a **medical education simulation** where students take a history from an AI standardized patient and perform a **virtual physical exam** on a **3D body** (React Three Fiber). This repo is a **single Next.js app** (App Router + Route Handlers) with **Supabase Postgres** persistence.

## Architecture principle (read this once)

**The LLM is not the source of truth.**

1. `data/cases/*.json` defines the patient and clinical facts.
2. Postgres `sessions` stores deterministic state (`revealed_facts`, `completed_exam_actions`, `pain_level`, `emotional_state`).
3. `/api/chat` uses `revealRules.ts` to decide which fact keys may surface from a student message.
4. `/api/exam` uses `examEngine.ts` to return findings from the case JSON (no model hallucination).
5. `patientResponder.ts` / `proctorScorer.ts` only **phrase** responses within an allowlist (OpenAI optional).

## Prerequisites

- Node.js 20+
- A Supabase project (or local Supabase) with SQL from `supabase/schema.sql` applied
- `supabase/seed.sql` run so the `appendicitis` case row exists (sessions FK require it)

## Environment

Copy `.env.example` to `.env.local` and fill values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (used by browser helpers; MVP UI talks to Route Handlers only)
- `SUPABASE_SERVICE_ROLE_KEY` (**server only** — Route Handlers insert/update session tables)
- `OPENAI_API_KEY` (optional — without it, patient + debrief copy uses deterministic templates)

## Database setup

1. In Supabase SQL editor (or `psql`), run `supabase/schema.sql`.
2. Run `supabase/seed.sql` to insert the `appendicitis` case.
3. Alternatively use Supabase CLI migrations in `supabase/migrations/`.

> **RLS:** tables have RLS enabled with **no broad anon policies** on purpose — the demo uses the **service role** from trusted server code only.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, start the appendicitis session, chat, click body hotspots, then open the debrief.

## Key routes

| Route | Purpose |
| --- | --- |
| `POST /api/sessions` | Create session (`{ caseId }`) |
| `GET /api/sessions/:sessionId` | Session + transcript turns |
| `POST /api/chat` | Student message → deterministic reveals + patient reply |
| `POST /api/exam` | `{ action, target }` → deterministic finding + session update |
| `POST /api/score` | Persist score report + mark session completed |
| `GET /api/score?sessionId=` | Fetch latest score report |
| `GET /api/cases/:caseId` | Public-ish case summary |
| `POST /api/voice/stt` / `tts` | Stubs for future audio pipeline |

## Project layout (high level)

- `lib/store/simUiStore.ts` — tiny Zustand store (body highlight shared with the canvas)
- `app/(marketing)/page.tsx` — landing
- `app/sim/[sessionId]/page.tsx` — encounter UI
- `app/debrief/[sessionId]/page.tsx` — debrief (scores latest report; generates if missing)
- `lib/sim/*` — deterministic simulation core
- `lib/ai/*` — optional LLM expression layer
- `data/cases/appendicitis.json` — canonical case file (mirrored in DB seed)

## Scripts

- `npm run dev` — Next dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
