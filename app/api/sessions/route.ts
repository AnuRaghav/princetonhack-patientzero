import { NextResponse } from "next/server";

import { CreateSessionRequestSchema, CreateSessionResponseSchema } from "@/lib/api/schemas";
import { loadCaseFromDisk } from "@/lib/cases/loader";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = CreateSessionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { caseId } = parsed.data;
  try {
    await loadCaseFromDisk(caseId);
  } catch {
    return NextResponse.json({ error: "Unknown case" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .maybeSingle();
  if (caseErr) return NextResponse.json({ error: caseErr.message }, { status: 500 });
  if (!caseRow) {
    return NextResponse.json(
      { error: "Case not provisioned in database. Run supabase/seed.sql." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      case_id: caseId,
      status: "active",
      emotional_state: "anxiety",
      pain_level: 4,
      revealed_facts: [],
      completed_exam_actions: [],
    })
    .select("id, case_id, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  const body = CreateSessionResponseSchema.parse({
    sessionId: data.id,
    caseId: data.case_id,
    status: data.status,
  });
  return NextResponse.json(body);
}
