import { NextResponse } from "next/server";

import { loadCase } from "@/lib/cases/loader";
import { toSessionRow, toTranscriptRow } from "@/lib/session/db";
import { projectFindings } from "@/lib/sim/findingsProjector";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { sessionId } = await ctx.params;
  const supabase = createAdminClient();

  const { data: session, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: turns, error: tErr } = await supabase
    .from("transcript_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const sessionRow = toSessionRow(session);

  // Recompute findings on read so legacy rows / out-of-band edits stay
  // consistent with the deterministic projection. Cheap; the projector
  // is pure and runs on a single session's worth of state.
  let findings = sessionRow.discovered_findings;
  try {
    const caseDoc = await loadCase(sessionRow.case_id);
    findings = projectFindings({
      caseDoc,
      revealedFacts: sessionRow.revealed_facts,
      completedExamActions: sessionRow.completed_exam_actions,
      emotionalState: sessionRow.emotional_state,
      painLevel: sessionRow.pain_level,
      diagnosisHypotheses: sessionRow.diagnosis_hypotheses,
    });
  } catch {
    // case file missing — return whatever was persisted.
  }

  return NextResponse.json({
    session: { ...sessionRow, discovered_findings: findings },
    transcript: (turns ?? []).map(toTranscriptRow),
  });
}
