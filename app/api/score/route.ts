import { NextResponse } from "next/server";
import { z } from "zod";

import { proctorScorer } from "@/lib/ai/proctorScorer";
import { ScoreRequestSchema, ScoreResponseSchema } from "@/lib/api/schemas";
import { loadCaseFromDisk } from "@/lib/cases/loader";
import { toSessionRow, toTranscriptRow } from "@/lib/session/db";
import { createAdminClient } from "@/lib/supabase/admin";

const QuerySchema = z.object({
  sessionId: z.string().uuid(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ sessionId: url.searchParams.get("sessionId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "sessionId query param required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("score_reports")
    .select("*")
    .eq("session_id", parsed.data.sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No score yet" }, { status: 404 });

  return NextResponse.json({
    checklistScore: data.checklist_score,
    empathyScore: data.empathy_score,
    diagnosticScore: data.diagnostic_score,
    summary: data.summary,
    misses: data.misses,
    strengths: data.strengths,
  });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ScoreRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId } = parsed.data;
  const supabase = createAdminClient();

  const { data: sessionRow, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (error || !sessionRow) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = toSessionRow(sessionRow);
  const caseDoc = await loadCaseFromDisk(session.case_id);

  const { data: turns, error: tErr } = await supabase
    .from("transcript_turns")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const transcriptRows = (turns ?? []).map(toTranscriptRow);
  const studentLines = transcriptRows.filter((t) => t.speaker === "student").map((t) => t.message);
  const transcriptText = transcriptRows.map((t) => `${t.speaker}: ${t.message}`).join("\n");

  const score = await proctorScorer({
    caseDoc,
    session,
    studentLines,
    transcriptText,
  });

  const { error: insErr } = await supabase.from("score_reports").insert({
    session_id: sessionId,
    checklist_score: score.checklistScore,
    empathy_score: score.empathyScore,
    diagnostic_score: score.diagnosticScore,
    summary: score.summary,
    misses: score.misses,
    strengths: score.strengths,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await supabase.from("sessions").update({ status: "completed" }).eq("id", sessionId);

  const body = ScoreResponseSchema.parse({
    checklistScore: score.checklistScore,
    empathyScore: score.empathyScore,
    diagnosticScore: score.diagnosticScore,
    summary: score.summary,
  });
  return NextResponse.json(body);
}
