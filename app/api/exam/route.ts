import { NextResponse } from "next/server";

import { ExamRequestSchema, ExamResponseSchema } from "@/lib/api/schemas";
import { loadCaseFromDisk } from "@/lib/cases/loader";
import { applyExamCompletion } from "@/lib/sim/reducers";
import { runExam, emotionFromExam } from "@/lib/sim/examEngine";
import { toSessionRow } from "@/lib/session/db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExamActionRecord } from "@/types/exam";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ExamRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId, action, target } = parsed.data;
  const supabase = createAdminClient();

  const { data: sessionRow, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (error || !sessionRow) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = toSessionRow(sessionRow);
  const caseDoc = await loadCaseFromDisk(session.case_id);

  const result = runExam(caseDoc, action, target, session.completed_exam_actions);

  const record: ExamActionRecord = {
    action,
    target,
    finding_key: result.finding_key,
  };

  const emotion = emotionFromExam(result);
  const next = applyExamCompletion(session, record, result.painDelta, emotion);

  await supabase.from("exam_events").insert({
    session_id: sessionId,
    action_type: action,
    target,
    finding_key: result.finding_key,
    payload: {
      finding: result.finding,
      painDelta: result.painDelta,
      visualCue: result.visualCue,
    },
  });

  const { error: upErr } = await supabase
    .from("sessions")
    .update({
      completed_exam_actions: next.completed_exam_actions,
      pain_level: next.pain_level,
      emotional_state: next.emotional_state,
    })
    .eq("id", sessionId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const body = ExamResponseSchema.parse({
    finding: result.finding,
    painDelta: result.painDelta,
    audioUrl: result.audioUrl,
    visualCue: result.visualCue,
  });
  return NextResponse.json(body);
}
