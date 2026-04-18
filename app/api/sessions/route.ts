import { NextResponse } from "next/server";

import { CreateSessionRequestSchema, CreateSessionResponseSchema } from "@/lib/api/schemas";
import { loadCase } from "@/lib/cases/loader";
import { projectFindings } from "@/lib/sim/findingsProjector";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreateSessionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { caseId } = parsed.data;
  let caseDoc;
  try {
    caseDoc = await loadCase(caseId);
  } catch {
    return NextResponse.json({ error: "Unknown case" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const casePk = /^\d+$/.test(caseId.trim()) ? Number(caseId) : caseId;
  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id")
    .eq("id", casePk)
    .maybeSingle();
  if (caseErr) return NextResponse.json({ error: caseErr.message }, { status: 500 });
  if (!caseRow) {
    return NextResponse.json({ error: "Case not found in database." }, { status: 400 });
  }

  const initialFindings = projectFindings({
    caseDoc,
    revealedFacts: [],
    completedExamActions: [],
    emotionalState: "anxiety",
    painLevel: 4,
    diagnosisHypotheses: [],
  });

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      case_id: casePk,
      status: "active",
      emotional_state: "anxiety",
      pain_level: 4,
      revealed_facts: [],
      completed_exam_actions: [],
      discovered_findings: initialFindings,
      diagnosis_hypotheses: [],
    })
    .select("id, case_id, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  const body = CreateSessionResponseSchema.parse({
    sessionId: data.id,
    caseId: String(data.case_id),
    status: data.status,
  });
  return NextResponse.json(body);
}
