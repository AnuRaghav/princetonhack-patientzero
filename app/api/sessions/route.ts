import { NextResponse } from "next/server";

import { CreateSessionRequestSchema, CreateSessionResponseSchema } from "@/lib/api/schemas";
import { loadCase } from "@/lib/cases/loader";
import { projectFindings } from "@/lib/sim/findingsProjector";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPatientById } from "@/lib/synthea/queries";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreateSessionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patientFk = parsed.data.caseId.trim();

  const supabase = createAdminClient();

  let patient = await getPatientById(patientFk).catch(() => null);

  if (!patient) {
    try {
      await loadCase(patientFk);
    } catch {
      return NextResponse.json({ error: "Unknown patient" }, { status: 404 });
    }

    const { error: stubErr } = await supabase.from("patients").upsert({ Id: patientFk }, { onConflict: "Id" });
    if (stubErr) {
      return NextResponse.json({ error: stubErr.message }, { status: 500 });
    }

    patient = await getPatientById(patientFk).catch(() => null);
    if (!patient) {
      return NextResponse.json({ error: "Could not provision patient stub" }, { status: 500 });
    }
  }

  const caseDoc = await loadCase(patientFk);

  const initialFindings = projectFindings({
    caseDoc,
    revealedFacts: [],
    completedExamActions: [],
    emotionalState: "anxiety",
    painLevel: 4,
    diagnosisHypotheses: [],
  });

  type InsertedSessionRow = {
    id: string;
    status: string;
    patient?: string | null;
    patient_id?: string | null;
    case_id?: string | null;
  };

  const insertBase = {
    status: "active",
    emotional_state: "anxiety",
    pain_level: 4,
    revealed_facts: [],
    completed_exam_actions: [],
    discovered_findings: initialFindings,
    diagnosis_hypotheses: [],
  };

  async function tryInsert(
    fk: Record<string, string>,
    select: string,
  ): Promise<{ data: InsertedSessionRow | null; error: { message: string } | null }> {
    const res = await supabase.from("sessions").insert({ ...insertBase, ...fk }).select(select).single();
    return {
      data: (res.data as InsertedSessionRow | null) ?? null,
      error: res.error ? { message: res.error.message } : null,
    };
  }

  // Canonical schema: `sessions.patient` (text) → `patients."Id"`.
  let { data, error } = await tryInsert({ patient: patientFk }, "id, status, patient");

  if (error && /patient/i.test(error.message) && /column/i.test(error.message)) {
    ({ data, error } = await tryInsert({ patient_id: patientFk }, "id, status, patient_id"));
  }
  if (error && /patient_id/i.test(error.message) && /column/i.test(error.message)) {
    ({ data, error } = await tryInsert({ case_id: patientFk }, "id, status, case_id"));
  }

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  const body = CreateSessionResponseSchema.parse({
    sessionId: data.id,
    caseId: String(data.patient ?? data.patient_id ?? data.case_id ?? patientFk),
    status: data.status,
  });
  return NextResponse.json(body);
}
