# AI-SP Repo State (Sat 11:17)

## 1) What’s already built

### App + UX flow
- Landing/start page: `app/(marketing)/page.tsx`
- Simulation page: `app/sim/[sessionId]/page.tsx`
- Debrief page: `app/debrief/[sessionId]/page.tsx`
- 3D exam interaction components are wired (`components/body/*`, `components/sim/*`)

### API surface (working core)
- `POST /api/sessions` -> create a session (`app/api/sessions/route.ts`)
- `GET /api/sessions/:sessionId` -> load session + transcript (`app/api/sessions/[sessionId]/route.ts`)
- `POST /api/chat` -> deterministic reveal + patient response (`app/api/chat/route.ts`)
- `POST /api/exam` -> exam action + finding + state update (`app/api/exam/route.ts`)
- `POST /api/score` and `GET /api/score` -> debrief scoring persistence/fetch (`app/api/score/route.ts`)
- `GET /api/cases/:caseId` -> case summary (`app/api/cases/[caseId]/route.ts`)

### Deterministic simulation core
- Reveal logic: `lib/sim/revealRules.ts`
- State reducers: `lib/sim/reducers.ts`
- State machine: `lib/sim/stateMachine.ts`
- Exam engine: `lib/sim/examEngine.ts`
- Checklist/summary assembly: `lib/sim/sessionAssembler.ts`

### Case model + validation
- Canonical case data: `data/cases/appendicitis.json`
- Disk loader + cache: `lib/cases/loader.ts`
- Zod schema validation: `lib/cases/schemas.ts`

### Supabase architecture (correct direction)
- Service-role client (server-only): `lib/supabase/admin.ts`
- Route handlers use service role for DB writes
- Browser/server public clients exist: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Schema + seed SQL present:
  - `supabase/migrations/20250418000000_initial.sql`
  - `supabase/seed.sql`

---

## 2) What is partial / not fully built

- Voice API is stubbed:
  - `app/api/voice/stt/route.ts` returns empty text
  - `app/api/voice/tts/route.ts` returns `audioUrl: null`
- LLM layer is optional fallback:
  - `lib/ai/patientResponder.ts`
  - `lib/ai/proctorScorer.ts`
  - Works without `OPENAI_API_KEY` via deterministic fallback text/summary
- No automated tests found (`test`/`spec` files absent)
- Supabase local config not committed (`supabase/config.toml` missing)
- README/env mismatch:
  - `README.md` references `.env.example`, but file is missing
- `app/todos/page.tsx` appears leftover and queries `todos` table not in current migration

---

## 3) Open ends / likely breakpoints

1. **DB not initialized**
   - If migration + seed are not applied, core routes fail on missing tables/rows.

2. **Missing seeded case row**
   - `POST /api/sessions` requires case row in `public.cases` (e.g., `appendicitis`).

3. **Env mismatch**
   - Wrong `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` pairing breaks server DB access.

4. **RLS confusion**
   - RLS is enabled intentionally; writes are expected through server handlers (service role), not browser.

5. **`/todos` route**
   - Visiting `/todos` may fail due to missing `todos` table.

---

## 4) Current maturity snapshot

- **Product flow**: MVP-ready end-to-end (start -> encounter -> debrief).
- **Backend**: coherent deterministic-first architecture, good for hackathon demo.
- **Gaps**: setup hardening + developer ergonomics (tests, env template, local supabase config, voice implementation).
- **Highest practical risk now**: setup drift (DB/env), not core simulation logic.

---

## 5) Immediate next actions (priority)

1. Apply migration + seed in Supabase project and verify `appendicitis` exists.
2. Add `.env.example` to match real required vars.
3. Decide whether to remove `/todos` or add its table/migration.
4. Add smoke tests for `/api/sessions`, `/api/chat`, `/api/exam`, `/api/score`.
5. Implement real STT/TTS or hide voice endpoints in UI until ready.