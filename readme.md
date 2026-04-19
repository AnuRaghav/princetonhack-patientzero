# Patient Zero

Clinical simulation console for medical education: deterministic mystery cases, AI patient dialogue (Gemini), 3D exam hotspots, and scored debriefs.

## Requirements

- **Node.js** 20+ (recommended)
- **npm** (ships with Node)

## Setup

```bash
npm install
```

Create **`.env.local`** in the project root (not committed). Typical variables:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin tasks (if used) |
| `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini (AI Studio) REST |
| `GEMINI_CONVERSATION_MODEL` / `GEMINI_MODEL` | Model id for patient chat |
| `OPENAI_API_KEY` | Optional: other AI paths (proctor, etc.) |
| `ELEVENLABS_API_KEY` | Optional: voice |

Exact behavior is implemented in `lib/ai/geminiRest.ts`, `lib/supabase/*`, and related modules.

## Scripts

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint
```

## Project layout (high level)

| Path | What |
|------|------|
| `app/` | Routes: marketing home, **`/cases/*`** curated challenges, **`/cases/[slug]/results`**, **`/sim/[sessionId]`** lab |
| `components/curated/` | Curated shell, interview findings, finish dialog |
| `components/body/` | Three.js **`BodyScene`**, **`BodyModel`**, hotspots, **`hotspotLayout`** presets |
| `components/encounter/` | Encounter UI + converse integration |
| `lib/curatedCases.ts` | Catalog (`maria-wolf`, `jason-mehta`) |
| `lib/Maria.json`, `lib/Jason.json` | Case payloads (opening line, diagnosis field for rubric, etc.) |
| `lib/curated/` | Challenge result storage, **`scoreCase`**, rubrics, symptom triggers |
| `public/models/` | **`maria.glb`**, **`jason.glb`** (lowercase filenames; used by curated viewer) |

## Curated mystery cases

- **`/cases/maria-wolf`** and **`/cases/jason-mehta`** — timer, transcript, symptom discovery from dialogue, body exam hotspots, submission → **`/cases/[slug]/results`** with deterministic scoring helpers.
- Gameplay tuning: **`lib/curated/interviewSymptomTriggers.ts`**, **`components/curated/CuratedCaseShell.tsx`**, case JSON files, **`lib/curated/scoringRubrics.ts`**, **`components/body/hotspotLayout.ts`** per-slug presets.

## API routes

Patient text chat for curated encounters uses **`POST /api/patient/converse`** (`app/api/patient/converse/route.ts`), backed by Gemini configuration in `lib/ai/`.

## License / visibility

Repository is **`private`** in `package.json`. Adjust for your team’s policy.
