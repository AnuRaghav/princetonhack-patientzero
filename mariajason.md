# Maria / Jason - changes from this session

This document only describes work discussed in the chat that touched **Maria Wolf** (`maria-wolf`) and **Jason Mehta** (`jason-mehta`) curated flows, the 3D viewer, scoring, and related UX.

## Curated scoring & debrief

- **`lib/curated/scoreCase.ts`** - Deterministic **`scoreCase(run, rubric)`** (80 clinical + 20 behavioral): diagnosis, symptom coverage, extra-info coverage, question yield, efficiency; helpers **`clamp`**, **`normalize`**, **`intersectionCount`**; optional qualitative **`feedback`**.
- **`lib/curated/scoringRubrics.ts`** - **`getScoreRubric(slug)`** pulls diagnosis text from **`lib/Maria.json`** / **`lib/Jason.json`**, symptom labels from triggers, extra-info lists, timing bands from **`lib/curatedCases.ts`** (`estimatedMinutes`).
- **`lib/curated/extraInfoDiscovery.ts`** - Keyword hits on patient dialogue for **helpful context** scoring rows.
- **`lib/curated/curatedChallengeScore.ts`** - **`computeCuratedChallengeScore`** builds a run from stored challenge payload + transcript (useful questions, extras).
- **`lib/curated/challengeResult.ts`** - Optional **`score?: ScoreCaseResult`** on stored results.
- **`components/curated/CuratedCaseShell.tsx`** - On submit diagnosis: computes score, saves **`{ ...payload, score }`** to **`sessionStorage`**.
- **`app/cases/[slug]/results/page.tsx`** - Shows overall / clinical / behavioral scores, breakdown bars, feedback lists; recomputes score if legacy payload has no **`score`**.

## Encounter finish copy

- **`components/curated/ChallengeFinishDialog.tsx`** - Debrief copy updated to mention the scored results screen.

## 3D models & paths

- Curated shell maps slug → **`/models/maria.glb`** and **`/models/jason.glb`** (filenames must match **`public/models/`** exactly; Linux/production are case-sensitive).
- **`components/body/BodyModel.tsx`** - Optional **`modelSrc`**; **auto-fit** mesh to a target max dimension so GLBs are not microscopic; material / texture **sRGB** tuning; **`useGLTF` preload** for curated paths.
- **`components/body/BodyScene.tsx`** - Passes **`modelSrc`**; **renderer** (**`AgXToneMapping`**, **`outputColorSpace: SRGBColorSpace`**, **`alpha: false`**); **`Environment`** preset + colored lights; **`Suspense`** around assets that suspend.
- **Fixed blank / flickering canvas** - Removed **`opacity`** on the workspace grid ancestor of the canvas (opacity on ancestors breaks WebGL compositing). Replaced with a separate **dim overlay** (`bg-black/45`) so the canvas is not faded via CSS opacity.

## Hotspots & layout

- **`components/body/hotspotLayout.ts`** - **`computeHotspotLayout(bounds, layoutPreset)`**: midline-based lateral offsets (T-pose-safe), **`BASE`** tunables, **`PRESET["maria-wolf"]`** / **`PRESET["jason-mehta"]`** overrides.
- **`components/body/BodyScene.tsx`** - **`layoutPreset`** prop (default **`default`** for sim); **`pulseTargets`** for discovery pulse; **`CuratedCaseShell`** passes **`layoutPreset={slug}`**.
- **`components/body/regionInfo.ts`** - **`mapSymptomRegionsToHotspots`** maps **`abdomen` / `rlq`** → **`stomach`** for spheres that exist on the rig.
- **Camera framing** - Slightly raised **`group`** Y, orbit **target**, and camera **y** so the figure sits higher in the viewport.

## Bounds coordinate fix (major alignment bug)

- **`Box3.setFromObject`** returns **world-space** bounds; hotspot **`position`** is **parent-local**. **`BodyModel`** now converts the world AABB of the fitted root into the **parent group's local space** (8 corners × **`inverse(parent.matrixWorld)`**) before **`onBoundsChange`**, so hotspots align with Maria/Jason meshes.

## Interview feedback loop

- **`components/curated/CuratedInterviewFindings.tsx`** - Incremental **new symptom** detection vs prior trigger keys; snapshot effect runs only when **`assessmentStartedAt`** / **`slug`** changes (not every message, so **`prevKeys`** is not reset each turn).
- **`CuratedCaseShell.tsx`** - Toast **"New symptom discovered"** + symptom labels; timers clear pulse highlights on **`BodyScene`** (**`pulseTargets`**).
- **`components/body/BodyHotspot.tsx`** - **`pulse`** styling (amber emphasis).

## README

- Root **`README.md`** was added as general project documentation (separate from this file).

---

To extend Maria/Jason gameplay later, typical touchpoints are **`lib/Maria.json`**, **`lib/Jason.json`**, **`lib/curated/interviewSymptomTriggers.ts`**, **`components/body/hotspotLayout.ts`** presets, and **`lib/curated/scoringRubrics.ts`**.
