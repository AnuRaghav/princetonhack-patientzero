import { NextResponse } from "next/server";

import { DiagnosisRequestSchema, DiagnosisResponseSchema } from "@/lib/api/schemas";
import { loadCase } from "@/lib/cases/loader";
import { toSessionRow } from "@/lib/session/db";
import {
  appendDiagnosisHypothesis,
  projectFindings,
} from "@/lib/sim/findingsProjector";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Append-only diagnosis hypothesis endpoint.
 *
 * Students may submit one or more working diagnoses during the encounter.
 * Each submission is timestamped and stored on the session; the latest
 * structured EncounterFindings projection is recomputed and persisted so
 * the 3D layer always reads from a single canonical source.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = DiagnosisRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId, diagnosis, confidence, rationale } = parsed.data;
  const supabase = createAdminClient();

  const { data: sessionRow, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error || !sessionRow) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = toSessionRow(sessionRow);
  const caseDoc = await loadCase(session.case_id);

  const nextHypotheses = appendDiagnosisHypothesis(session.diagnosis_hypotheses, {
    diagnosis,
    confidence,
    rationale: rationale ?? null,
  });

  const findings = projectFindings({
    caseDoc,
    revealedFacts: session.revealed_facts,
    completedExamActions: session.completed_exam_actions,
    emotionalState: session.emotional_state,
    painLevel: session.pain_level,
    diagnosisHypotheses: nextHypotheses,
  });

  const { error: upErr } = await supabase
    .from("sessions")
    .update({
      diagnosis_hypotheses: nextHypotheses,
      discovered_findings: findings,
    })
    .eq("id", sessionId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const body = DiagnosisResponseSchema.parse({
    diagnosisHypotheses: nextHypotheses,
    findings,
  });
  return NextResponse.json(body);
}
